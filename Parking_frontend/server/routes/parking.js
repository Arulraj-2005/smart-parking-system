
// FORCE DEPLOY - CHECKOUT FIX v3
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
// ... rest of your code

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
    const result = await pool.query(`
      SELECT ps.*, z.name as zone_name
      FROM parking_spots ps
      JOIN zones z ON ps.zone_id = z.id
      ORDER BY ps.spot_number
    `);
    res.json({ success: true, data: { spots: result.rows } });
  } catch (error) {
    console.error('Get spots error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch spots' });
  }
});

// Get user's sessions (active and completed)
router.get('/sessions/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ps.id,
        ps.spot_id,
        ps.user_id,
        ps.entry_time,
        ps.exit_time as end_time,
        ps.duration_minutes,
        ps.total_amount,
        ps.payment_status,
        ps.license_plate,
        psp.spot_number,
        pz.name as zone_name,
        psp.hourly_rate,
        CASE 
          WHEN ps.duration_minutes IS NOT NULL THEN ROUND(ps.duration_minutes / 60.0, 1)
          ELSE 1
        END as duration_hours
      FROM parking_sessions ps
      JOIN parking_spots psp ON ps.spot_id = psp.id
      JOIN zones pz ON psp.zone_id = pz.id
      WHERE ps.user_id = $1
      ORDER BY ps.entry_time DESC
    `, [req.user.id]);

    const sessions = result.rows.map(s => ({
      id: s.id,
      spot_id: s.spot_id,
      spot_number: s.spot_number,
      zone_name: s.zone_name,
      entry_time: s.entry_time,
      end_time: s.end_time,
      duration_hours: s.duration_hours,
      duration_minutes: s.duration_minutes,
      license_plate: s.license_plate || 'N/A',
      total_amount: s.total_amount,
      payment_status: s.payment_status,
      hourly_rate: s.hourly_rate,
      is_active: s.end_time === null
    }));

    res.json({ success: true, data: { sessions } });
  } catch (error) {
    console.error('Get my sessions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== BOOKING ENDPOINTS ====================

// Book a parking spot
router.post('/book', authenticateToken, async (req, res) => {
  try {
    const { spotId, licensePlate, durationHours } = req.body;
    const userId = req.user.id;

    const spotCheck = await pool.query(
      'SELECT * FROM parking_spots WHERE id = $1 AND is_occupied = false',
      [spotId]
    );

    if (spotCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Spot not available' });
    }

    const entryTime = new Date();
    const exitTime = new Date(entryTime.getTime() + durationHours * 60 * 60 * 1000);
    const durationMinutes = durationHours * 60;

    const session = await pool.query(
      `INSERT INTO parking_sessions (spot_id, user_id, entry_time, exit_time, duration_minutes, payment_status, license_plate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [spotId, userId, entryTime, exitTime, durationMinutes, 'pending', licensePlate]
    );

    await pool.query('UPDATE parking_spots SET is_occupied = true WHERE id = $1', [spotId]);

    res.json({ success: true, data: { id: session.rows[0].id }, message: 'Spot booked successfully' });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check out from a spot (CHECKOUT)
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;
    
    console.log('Checkout request:', { sessionId, userId });
    
    const sessionResult = await pool.query(
      `SELECT ps.*, psp.hourly_rate, psp.id as spot_id
       FROM parking_sessions ps
       JOIN parking_spots psp ON ps.spot_id = psp.id
       WHERE ps.id = $1 AND ps.user_id = $2 AND ps.exit_time IS NULL`,
      [sessionId, userId]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Active session not found' });
    }
    
    const session = sessionResult.rows[0];
    const exitTime = new Date();
    const durationMs = exitTime - new Date(session.entry_time);
    const durationMinutes = Math.max(30, Math.ceil(durationMs / (60 * 1000)));
    const durationHours = Math.ceil(durationMinutes / 60);
    const totalAmount = durationHours * session.hourly_rate;
    
    await pool.query(
      `UPDATE parking_sessions 
       SET exit_time = $1, duration_minutes = $2, total_amount = $3, payment_status = 'paid'
       WHERE id = $4`,
      [exitTime, durationMinutes, totalAmount, sessionId]
    );
    
    await pool.query(
      'UPDATE parking_spots SET is_occupied = false WHERE id = $1',
      [session.spot_id]
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
    
    const sessionResult = await pool.query(
      `SELECT * FROM parking_sessions 
       WHERE spot_id = $1 AND user_id = $2 AND exit_time IS NULL`,
      [spotId, userId]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active session found' });
    }
    
    const session = sessionResult.rows[0];
    const newExitTime = new Date(session.exit_time);
    newExitTime.setHours(newExitTime.getHours() + extraHours);
    const newDurationMinutes = session.duration_minutes + (extraHours * 60);
    
    await pool.query(
      `UPDATE parking_sessions 
       SET exit_time = $1, duration_minutes = $2
       WHERE id = $3`,
      [newExitTime, newDurationMinutes, session.id]
    );
    
    res.json({ success: true, message: `Extended by ${extraHours} hours` });
  } catch (error) {
    console.error('Extend error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;