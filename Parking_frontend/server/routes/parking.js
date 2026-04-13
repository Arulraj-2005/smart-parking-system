import express from 'express';
import pool from '../config/database.js';

const router = express.Router();


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

export default router;