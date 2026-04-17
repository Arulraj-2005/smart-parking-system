import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ==================== GET ENDPOINTS ====================

// Get all zones with spots
router.get('/zones', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT z.*, 
        COUNT(ps.id) as total_spots,
        SUM(CASE WHEN ps.is_occupied = FALSE AND ps.is_reserved = FALSE THEN 1 ELSE 0 END) as available_spots,
        SUM(CASE WHEN ps.is_occupied = TRUE THEN 1 ELSE 0 END) as occupied_spots,
        SUM(CASE WHEN ps.is_reserved = TRUE THEN 1 ELSE 0 END) as reserved_spots
      FROM zones z
      LEFT JOIN parking_spots ps ON z.id = ps.zone_id
      WHERE z.is_active = TRUE
      GROUP BY z.id
    `);

    res.json({ success: true, data: { zones: result.rows } });

  } catch (error) {
    console.error('Get zones error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch zones' });
  }
});

// Get all parking spots
router.get('/spots', async (req, res) => {
  try {
    const { zone, type, available } = req.query;

    let query = `
      SELECT ps.*, z.name as zone_name, z.description as zone_description
      FROM parking_spots ps
      JOIN zones z ON ps.zone_id = z.id
      WHERE 1=1
    `;

    const params = [];

    if (zone) {
      params.push(zone);
      query += ` AND z.name = $${params.length}`;
    }

    if (type) {
      params.push(type);
      query += ` AND ps.spot_type = $${params.length}`;
    }

    if (available === 'true') {
      query += ` AND ps.is_occupied = FALSE AND ps.is_reserved = FALSE`;
    }

    const result = await pool.query(query, params);

    res.json({ success: true, data: { spots: result.rows } });

  } catch (error) {
    console.error('Get spots error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch spots' });
  }
});

// Get single spot details
router.get('/spots/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ps.*, z.name as zone_name,
        (SELECT license_plate FROM vehicles v 
         JOIN parking_sessions psess ON v.id = psess.vehicle_id 
         WHERE psess.spot_id = ps.id AND psess.exit_time IS NULL 
         LIMIT 1) as current_vehicle
      FROM parking_spots ps
      JOIN zones z ON ps.zone_id = z.id
      WHERE ps.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Spot not found' });
    }

    res.json({ success: true, data: { spot: result.rows[0] } });

  } catch (error) {
    console.error('Get spot error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch spot' });
  }
});

// Get user's reservations
router.get('/reservations/my', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, ps.spot_number, z.name as zone_name, v.license_plate
      FROM reservations r
      JOIN parking_spots ps ON r.spot_id = ps.id
      JOIN zones z ON ps.zone_id = z.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.user_id = $1 AND r.status = 'active'
      ORDER BY r.start_time ASC
    `, [req.user.id]);

    res.json({ success: true, data: { reservations: result.rows } });

  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reservations' });
  }
});

// ==================== BOOKING ENDPOINTS ====================

// Book a parking spot (CHECK-IN)
router.post('/book', authenticateToken, async (req, res) => {
  try {
    const { spotId, licensePlate, durationHours } = req.body;
    const userId = req.user.id;

    // Check if spot exists and is available
    const spotCheck = await pool.query(
      'SELECT * FROM parking_spots WHERE id = $1 AND is_occupied = false AND is_reserved = false',
      [spotId]
    );

    if (spotCheck.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Spot not available' 
      });
    }

    // Calculate times
    const entryTime = new Date();
    const exitTime = new Date(entryTime.getTime() + durationHours * 60 * 60 * 1000);
    const durationMinutes = durationHours * 60;

    // Create parking session (using your actual column names)
    const session = await pool.query(
      `INSERT INTO parking_sessions (spot_id, user_id, entry_time, exit_time, duration_minutes, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [spotId, userId, entryTime, exitTime, durationMinutes, 'pending']
    );

    // Mark spot as occupied
    await pool.query(
      'UPDATE parking_spots SET is_occupied = true WHERE id = $1',
      [spotId]
    );

    res.json({ 
      success: true, 
      data: session.rows[0],
      message: 'Spot booked successfully'
    });

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check out from a spot
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;
    
    const session = await pool.query(
      'SELECT * FROM parking_sessions WHERE id = $1 AND user_id = $2 AND exit_time IS NULL',
      [sessionId, userId]
    );
    
    if (session.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Active session not found' });
    }
    
    const exitTime = new Date();
    const durationMs = exitTime - session.rows[0].entry_time;
    const durationMinutes = Math.max(60, Math.ceil(durationMs / (60 * 1000)));
    const durationHours = Math.ceil(durationMinutes / 60);
    
    // Get spot rate
    const spot = await pool.query(
      'SELECT hourly_rate FROM parking_spots WHERE id = $1',
      [session.rows[0].spot_id]
    );
    
    const totalAmount = durationHours * spot.rows[0].hourly_rate;
    
    await pool.query(
      `UPDATE parking_sessions 
       SET exit_time = $1, duration_minutes = $2, total_amount = $3, payment_status = 'paid'
       WHERE id = $4`,
      [exitTime, durationMinutes, totalAmount, sessionId]
    );
    
    // Free up the spot
    await pool.query(
      'UPDATE parking_spots SET is_occupied = false WHERE id = $1',
      [session.rows[0].spot_id]
    );
    
    res.json({ success: true, message: 'Checked out successfully', data: { totalAmount } });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Extend a booking
router.post('/extend', authenticateToken, async (req, res) => {
  try {
    const { spotId, extraHours } = req.body;
    const userId = req.user.id;
    
    const session = await pool.query(
      `SELECT * FROM parking_sessions 
       WHERE spot_id = $1 AND user_id = $2 AND exit_time IS NULL`,
      [spotId, userId]
    );
    
    if (session.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active session found' });
    }
    
    const newExitTime = new Date(session.rows[0].exit_time);
    newExitTime.setHours(newExitTime.getHours() + extraHours);
    const newDurationMinutes = session.rows[0].duration_minutes + (extraHours * 60);
    
    await pool.query(
      `UPDATE parking_sessions 
       SET exit_time = $1, duration_minutes = $2
       WHERE id = $3`,
      [newExitTime, newDurationMinutes, session.rows[0].id]
    );
    
    res.json({ success: true, message: `Extended by ${extraHours} hours` });
  } catch (error) {
    console.error('Extend error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's active sessions
router.get('/sessions/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ps.*, pz.name as zone_name, psp.spot_number,
             psp.spot_type, psp.hourly_rate
      FROM parking_sessions ps
      JOIN parking_spots psp ON ps.spot_id = psp.id
      JOIN zones pz ON psp.zone_id = pz.id
      WHERE ps.user_id = $1 AND ps.exit_time IS NULL
      ORDER BY ps.entry_time DESC
    `, [req.user.id]);

    // Transform to match frontend expected format
    const sessions = result.rows.map(s => ({
      id: s.id,
      spot_number: s.spot_number,
      zone_name: s.zone_name,
      entry_time: s.entry_time,
      end_time: s.exit_time,
      duration_hours: Math.ceil(s.duration_minutes / 60),
      duration_minutes: s.duration_minutes,
      license_plate: s.license_plate || 'N/A',
      total_amount: s.total_amount,
      payment_status: s.payment_status
    }));

    res.json({ success: true, data: { sessions } });
  } catch (error) {
    console.error('Get my sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
});

export default router;