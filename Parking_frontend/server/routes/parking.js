import express from 'express';
import pool from '../config/database.js';

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

// ==================== BOOKING ENDPOINTS (ADD THESE) ====================

// Book a parking spot (CHECK-IN)
router.post('/book', async (req, res) => {
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

    const spot = spotCheck.rows[0];

    // Calculate times
    const entryTime = new Date();
    const endTime = new Date(entryTime.getTime() + durationHours * 60 * 60 * 1000);

    // Create parking session
    const session = await pool.query(
      `INSERT INTO parking_sessions (spot_id, user_id, entry_time, end_time, duration_hours, license_plate, status, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [spotId, userId, entryTime, endTime, durationHours, licensePlate, 'active', 'pending']
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
router.post('/checkout', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;
    
    const session = await pool.query(
      'SELECT * FROM parking_sessions WHERE id = $1 AND user_id = $2 AND status = $3',
      [sessionId, userId, 'active']
    );
    
    if (session.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Active session not found' });
    }
    
    const exitTime = new Date();
    const durationMs = exitTime - session.rows[0].entry_time;
    const durationHours = Math.max(1, Math.ceil(durationMs / (60 * 60 * 1000)));
    
    // Get spot rate
    const spot = await pool.query(
      'SELECT hourly_rate FROM parking_spots WHERE id = $1',
      [session.rows[0].spot_id]
    );
    
    const totalAmount = durationHours * spot.rows[0].hourly_rate;
    
    await pool.query(
      `UPDATE parking_sessions 
       SET exit_time = $1, duration_minutes = $2, total_amount = $3, status = 'completed', payment_status = 'paid'
       WHERE id = $4`,
      [exitTime, durationHours * 60, totalAmount, sessionId]
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
router.post('/extend', async (req, res) => {
  try {
    const { spotId, extraHours } = req.body;
    const userId = req.user.id;
    
    const session = await pool.query(
      `SELECT * FROM parking_sessions 
       WHERE spot_id = $1 AND user_id = $2 AND status = 'active'`,
      [spotId, userId]
    );
    
    if (session.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active session found' });
    }
    
    const newEndTime = new Date(session.rows[0].end_time);
    newEndTime.setHours(newEndTime.getHours() + extraHours);
    
    await pool.query(
      `UPDATE parking_sessions 
       SET end_time = $1, duration_hours = duration_hours + $2
       WHERE id = $3`,
      [newEndTime, extraHours, session.rows[0].id]
    );
    
    res.json({ success: true, message: `Extended by ${extraHours} hours` });
  } catch (error) {
    console.error('Extend error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's active sessions
router.get('/sessions/my', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ps.*, pz.name as zone_name, pz.id as zone_id,
             v.license_plate
      FROM parking_sessions ps
      JOIN parking_spots psp ON ps.spot_id = psp.id
      JOIN zones pz ON psp.zone_id = pz.id
      LEFT JOIN vehicles v ON ps.vehicle_id = v.id
      WHERE ps.user_id = $1 AND ps.status = 'active'
      ORDER BY ps.entry_time DESC
    `, [req.user.id]);

    res.json({ success: true, data: { sessions: result.rows } });
  } catch (error) {
    console.error('Get my sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
});

// ==================== RESERVATION ENDPOINTS ====================

// Reserve a spot
router.post('/spots/:id/reserve', async (req, res) => {
  try {
    const { start_time, end_time, vehicle_id } = req.body;
    const spotId = req.params.id;

    // Check if spot exists
    const spotResult = await pool.query(
      'SELECT * FROM parking_spots WHERE id = $1',
      [spotId]
    );

    if (spotResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Spot not found' });
    }

    const spot = spotResult.rows[0];

    if (spot.is_occupied || spot.is_reserved) {
      return res.status(409).json({ success: false, message: 'Spot is not available' });
    }

    // Create reservation
    const insertResult = await pool.query(
      `INSERT INTO reservations 
       (user_id, spot_id, vehicle_id, start_time, end_time, status) 
       VALUES ($1, $2, $3, $4, $5, 'active') 
       RETURNING id`,
      [req.user.id, spotId, vehicle_id || null, start_time, end_time]
    );

    // Update spot
    await pool.query(
      'UPDATE parking_spots SET is_reserved = TRUE WHERE id = $1',
      [spotId]
    );

    res.status(201).json({
      success: true,
      message: 'Spot reserved successfully',
      data: { reservationId: insertResult.rows[0].id }
    });

  } catch (error) {
    console.error('Reserve spot error:', error);
    res.status(500).json({ success: false, message: 'Failed to reserve spot' });
  }
});

// Cancel reservation
router.delete('/reservations/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reservations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const reservation = result.rows[0];

    await pool.query(
      'UPDATE reservations SET status = $1 WHERE id = $2',
      ['cancelled', req.params.id]
    );

    await pool.query(
      'UPDATE parking_spots SET is_reserved = FALSE WHERE id = $1',
      [reservation.spot_id]
    );

    res.json({ success: true, message: 'Reservation cancelled' });

  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel reservation' });
  }
});

export default router;