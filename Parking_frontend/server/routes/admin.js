import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get admin dashboard stats
router.get('/stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Total spots
    const totalSpotsResult = await pool.query('SELECT COUNT(*) FROM parking_spots');
    const totalSpots = parseInt(totalSpotsResult.rows[0].count);
    
    // Available spots
    const availableSpotsResult = await pool.query('SELECT COUNT(*) FROM parking_spots WHERE is_occupied = false AND is_reserved = false');
    const availableSpots = parseInt(availableSpotsResult.rows[0].count);
    
    // Occupied spots
    const occupiedSpots = totalSpots - availableSpots;
    const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;
    
    // Today's revenue
    const todayRevenueResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM parking_sessions 
      WHERE DATE(exit_time) = CURRENT_DATE AND payment_status = 'paid'
    `);
    const todayRevenue = parseFloat(todayRevenueResult.rows[0].revenue);
    
    // Today's vehicles
    const todayVehiclesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM parking_sessions 
      WHERE DATE(entry_time) = CURRENT_DATE
    `);
    const todayVehicles = parseInt(todayVehiclesResult.rows[0].count);
    
    // Reserved spots
    const reservedSpotsResult = await pool.query('SELECT COUNT(*) FROM parking_spots WHERE is_reserved = true');
    const reservedSpots = parseInt(reservedSpotsResult.rows[0].count);
    
    res.json({
      success: true,
      data: {
        stats: {
          totalSpots,
          availableSpots,
          occupiedSpots,
          reservedSpots,
          occupancyRate,
          todayRevenue,
          todayVehicles
        }
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all users (admin only)
router.get('/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, full_name, role, phone, created_at, is_active
      FROM users
      ORDER BY id
    `);
    res.json({ success: true, data: { users: result.rows } });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user role (admin only)
router.put('/users/role', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, userId]
    );
    
    res.json({ success: true, message: 'Role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Don't allow deleting self
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;