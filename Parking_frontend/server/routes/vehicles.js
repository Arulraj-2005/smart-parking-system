import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();


// 🔹 Get all vehicles
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, u.username as owner_username, u.email as owner_email,
        (SELECT spot_number FROM parking_spots ps 
         JOIN parking_sessions psess ON ps.id = psess.spot_id 
         WHERE psess.vehicle_id = v.id AND psess.exit_time IS NULL 
         LIMIT 1) as current_spot
      FROM vehicles v
      LEFT JOIN users u ON v.user_id = u.id
      ORDER BY v.created_at DESC
    `);

    res.json({ success: true, data: { vehicles: result.rows } });

  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicles' });
  }
});


// 🔹 Get user's vehicles
router.get('/my', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*,
        (SELECT spot_number FROM parking_spots ps 
         JOIN parking_sessions psess ON ps.id = psess.spot_id 
         WHERE psess.vehicle_id = v.id AND psess.exit_time IS NULL 
         LIMIT 1) as current_spot,
        (SELECT entry_time FROM parking_sessions psess 
         WHERE psess.vehicle_id = v.id AND psess.exit_time IS NULL 
         LIMIT 1) as entry_time
      FROM vehicles v
      WHERE v.user_id = $1
      ORDER BY v.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, data: { vehicles: result.rows } });

  } catch (error) {
    console.error('Get my vehicles error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicles' });
  }
});


// 🔹 Add vehicle
router.post('/', [
  body('license_plate').notEmpty(),
  body('vehicle_type').isIn(['car', 'motorcycle', 'electric', 'truck']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { license_plate, vehicle_type, make, model, color } = req.body;

    const existing = await pool.query(
      'SELECT id FROM vehicles WHERE license_plate = $1',
      [license_plate]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Vehicle already registered' });
    }

    const result = await pool.query(
      `INSERT INTO vehicles (user_id, license_plate, vehicle_type, make, model, color) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [req.user.id, license_plate, vehicle_type, make || null, model || null, color || null]
    );

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: { vehicle: { id: result.rows[0].id, license_plate, vehicle_type, make, model, color } }
    });

  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ success: false, message: 'Failed to add vehicle' });
  }
});


// 🔹 Check-in
router.post('/check-in', [
  body('license_plate').notEmpty(),
  body('spot_id').notEmpty(),
], async (req, res) => {
  try {
    const { license_plate, spot_id } = req.body;

    let vehicleRes = await pool.query(
      'SELECT * FROM vehicles WHERE license_plate = $1',
      [license_plate]
    );

    let vehicleId;

    if (vehicleRes.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO vehicles (license_plate, vehicle_type) 
         VALUES ($1, $2) RETURNING id`,
        [license_plate, 'car']
      );
      vehicleId = insert.rows[0].id;
    } else {
      vehicleId = vehicleRes.rows[0].id;

      const sessionCheck = await pool.query(
        'SELECT * FROM parking_sessions WHERE vehicle_id = $1 AND exit_time IS NULL',
        [vehicleId]
      );

      if (sessionCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Vehicle already parked' });
      }
    }

    const spotRes = await pool.query(
      'SELECT * FROM parking_spots WHERE id = $1',
      [spot_id]
    );

    if (spotRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Spot not found' });
    }

    if (spotRes.rows[0].is_occupied) {
      return res.status(409).json({ success: false, message: 'Spot occupied' });
    }

    const session = await pool.query(
      `INSERT INTO parking_sessions (vehicle_id, spot_id, user_id) 
       VALUES ($1, $2, $3) RETURNING id`,
      [vehicleId, spot_id, req.user.id]
    );

    await pool.query(
      'UPDATE parking_spots SET is_occupied = TRUE WHERE id = $1',
      [spot_id]
    );

    res.status(201).json({
      success: true,
      message: 'Check-in successful',
      data: { sessionId: session.rows[0].id }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Check-in failed' });
  }
});


// 🔹 Check-out
router.post('/check-out', async (req, res) => {
  try {
    const { license_plate } = req.body;

    const vehicleRes = await pool.query(
      'SELECT * FROM vehicles WHERE license_plate = $1',
      [license_plate]
    );

    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const vehicleId = vehicleRes.rows[0].id;

    const sessionRes = await pool.query(`
      SELECT ps.*, ps2.hourly_rate
      FROM parking_sessions ps
      JOIN parking_spots ps2 ON ps.spot_id = ps2.id
      WHERE ps.vehicle_id = $1 AND ps.exit_time IS NULL
      ORDER BY ps.entry_time DESC
      LIMIT 1
    `, [vehicleId]);

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active session' });
    }

    const session = sessionRes.rows[0];

    const durationMinutes = Math.floor(
      (new Date() - new Date(session.entry_time)) / 60000
    );

    const durationHours = Math.ceil(durationMinutes / 60);
    const totalAmount = durationHours * session.hourly_rate;

    await pool.query(
      `UPDATE parking_sessions 
       SET exit_time = NOW(), duration_minutes = $1, total_amount = $2 
       WHERE id = $3`,
      [durationMinutes, totalAmount, session.id]
    );

    await pool.query(
      'UPDATE parking_spots SET is_occupied = FALSE WHERE id = $1',
      [session.spot_id]
    );

    res.json({
      success: true,
      message: 'Check-out successful',
      data: { durationMinutes, totalAmount }
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ success: false, message: 'Check-out failed' });
  }
});


// 🔹 Active sessions
router.get('/sessions/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ps.*, v.license_plate, ps2.spot_number, z.name as zone_name,
        EXTRACT(EPOCH FROM (NOW() - ps.entry_time)) / 60 AS duration_minutes
      FROM parking_sessions ps
      JOIN vehicles v ON ps.vehicle_id = v.id
      JOIN parking_spots ps2 ON ps.spot_id = ps2.id
      JOIN zones z ON ps2.zone_id = z.id
      WHERE ps.exit_time IS NULL
      ORDER BY ps.entry_time DESC
    `);

    res.json({ success: true, data: { sessions: result.rows } });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
});

export default router;