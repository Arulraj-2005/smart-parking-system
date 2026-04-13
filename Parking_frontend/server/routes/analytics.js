import express from 'express';
import pool from '../config/database.js';

const router = express.Router();


// 🔹 Dashboard Stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalSpotsRes = await pool.query('SELECT COUNT(*) FROM parking_spots');
    const occupiedRes = await pool.query('SELECT COUNT(*) FROM parking_spots WHERE is_occupied = TRUE');
    const availableRes = await pool.query(
      'SELECT COUNT(*) FROM parking_spots WHERE is_occupied = FALSE AND is_reserved = FALSE'
    );
    const reservedRes = await pool.query(
      'SELECT COUNT(*) FROM parking_spots WHERE is_reserved = TRUE'
    );

    const revenueRes = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) 
      FROM parking_sessions 
      WHERE DATE(exit_time) = CURRENT_DATE 
      AND payment_status = 'paid'
    `);

    const vehiclesRes = await pool.query(`
      SELECT COUNT(DISTINCT vehicle_id) 
      FROM parking_sessions 
      WHERE DATE(entry_time) = CURRENT_DATE
    `);

    const totalSpots = parseInt(totalSpotsRes.rows[0].count);
    const occupiedSpots = parseInt(occupiedRes.rows[0].count);
    const availableSpots = parseInt(availableRes.rows[0].count);
    const reservedSpots = parseInt(reservedRes.rows[0].count);
    const todayRevenue = parseFloat(revenueRes.rows[0].coalesce);
    const todayVehicles = parseInt(vehiclesRes.rows[0].count);

    const occupancyRate =
      totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalSpots,
          occupiedSpots,
          availableSpots,
          reservedSpots,
          todayRevenue,
          todayVehicles,
          occupancyRate
        }
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false });
  }
});


// 🔹 Weekly Revenue
router.get('/revenue/weekly', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(exit_time, 'YYYY-MM-DD') AS date,
        TO_CHAR(exit_time, 'Day') AS day_name,
        COALESCE(SUM(total_amount), 0) AS revenue,
        COUNT(*) AS transactions
      FROM parking_sessions
      WHERE exit_time >= NOW() - INTERVAL '7 days'
      AND payment_status = 'paid'
      GROUP BY date, day_name
      ORDER BY date ASC
    `);

    res.json({ success: true, data: { revenue: result.rows } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});


// 🔹 Vehicle Distribution
router.get('/vehicles/distribution', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT vehicle_type, COUNT(*) 
      FROM vehicles 
      GROUP BY vehicle_type
    `);

    res.json({ success: true, data: { distribution: result.rows } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});


// 🔹 Peak Hours
router.get('/peak-hours', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM entry_time) AS hour,
        COUNT(*) AS entry_count,
        AVG(EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60) AS avg_duration
      FROM parking_sessions
      WHERE entry_time >= NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY entry_count DESC
      LIMIT 10
    `);

    res.json({ success: true, data: { peakHours: result.rows } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});


// 🔹 Zone Occupancy
router.get('/zones/occupancy', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        z.id,
        z.name,
        z.description,
        COUNT(ps.id) AS total_spots,
        SUM(CASE WHEN ps.is_occupied THEN 1 ELSE 0 END) AS occupied,
        SUM(CASE WHEN NOT ps.is_occupied AND NOT ps.is_reserved THEN 1 ELSE 0 END) AS available,
        ROUND(
          SUM(CASE WHEN ps.is_occupied THEN 1 ELSE 0 END) * 100.0 / COUNT(ps.id), 2
        ) AS occupancy_rate
      FROM zones z
      LEFT JOIN parking_spots ps ON z.id = ps.zone_id
      WHERE z.is_active = TRUE
      GROUP BY z.id
    `);

    res.json({ success: true, data: { occupancy: result.rows } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});


// 🔹 AI Predictions (unchanged logic)
router.get('/predictions', async (req, res) => {
  try {
    const currentHour = new Date().getHours();
    const predictions = [];

    for (let i = 0; i < 24; i++) {
      const hour = (currentHour + i) % 24;

      let predicted = 30;
      if (hour >= 8 && hour <= 10) predicted = 85 + Math.random() * 15;
      else if (hour >= 12 && hour <= 14) predicted = 70 + Math.random() * 20;
      else if (hour >= 17 && hour <= 19) predicted = 80 + Math.random() * 15;
      else if (hour >= 20 || hour <= 6) predicted = 20 + Math.random() * 20;
      else predicted = 40 + Math.random() * 30;

      predictions.push({
        hour,
        predicted_occupancy: Math.round(predicted),
        confidence_score: Math.round(75 + Math.random() * 20)
      });
    }

    res.json({ success: true, data: { predictions } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});


// 🔹 Activity Feed
router.get('/activity', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM (
        SELECT 
          'check-in' AS action,
          v.license_plate,
          ps.spot_number,
          z.name AS zone_name,
          psess.entry_time AS timestamp
        FROM parking_sessions psess
        JOIN vehicles v ON psess.vehicle_id = v.id
        JOIN parking_spots ps ON psess.spot_id = ps.id
        JOIN zones z ON ps.zone_id = z.id

        UNION ALL

        SELECT 
          'check-out',
          v.license_plate,
          ps.spot_number,
          z.name,
          psess.exit_time
        FROM parking_sessions psess
        JOIN vehicles v ON psess.vehicle_id = v.id
        JOIN parking_spots ps ON psess.spot_id = ps.id
        JOIN zones z ON ps.zone_id = z.id
        WHERE psess.exit_time IS NOT NULL
      ) t
      ORDER BY timestamp DESC
      LIMIT 20
    `);

    res.json({ success: true, data: { activity: result.rows } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

export default router;