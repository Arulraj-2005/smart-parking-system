import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

console.log('RAZORPAY_KEY_ID exists:', !!process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create an order
router.post('/create-order', authenticateToken, async (req, res) => {
    try {
        const { amount, sessionId } = req.body;
        
        const options = {
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `parking_${sessionId}_${Date.now()}`,
            payment_capture: 1,
        };
        
        const order = await razorpayInstance.orders.create(options);
        
        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID,  // 👈 ADDED
        });
    } catch (error) {
        console.error('Razorpay order error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Verify payment
router.post('/verify', authenticateToken, async (req, res) => {
    try {
        const { order_id, payment_id, signature, sessionId } = req.body;
        
        const body = order_id + "|" + payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");
        
        if (expectedSignature === signature) {
            // Fetch session + hourly_rate to compute total_amount
            const sessionRes = await pool.query(
                `SELECT ps.entry_time, psp.hourly_rate
                 FROM parking_sessions ps
                 JOIN parking_spots psp ON ps.spot_id = psp.id
                 WHERE ps.id = $1`,
                [sessionId]
            );
            let totalAmount = null;
            if (sessionRes.rows.length > 0) {
                const { entry_time, hourly_rate } = sessionRes.rows[0];
                const durationMs = Date.now() - new Date(entry_time).getTime();
                const durationHours = Math.max(1, Math.ceil(durationMs / 3600000));
                totalAmount = durationHours * parseFloat(hourly_rate);
            }

            await pool.query(
                `UPDATE parking_sessions 
                 SET payment_status = 'paid', payment_method = 'razorpay',
                     total_amount = COALESCE($2, total_amount),
                     exit_time = COALESCE(exit_time, NOW()),
                     duration_minutes = COALESCE(duration_minutes,
                         EXTRACT(EPOCH FROM (NOW() - entry_time))::int / 60)
                 WHERE id = $1`,
                [sessionId, totalAmount]
            );
            
            // Always free the parking spot so the map updates immediately
            await pool.query(
                `UPDATE parking_spots SET is_occupied = false
                 WHERE id = (SELECT spot_id FROM parking_sessions WHERE id = $1)`,
                [sessionId]
            );

            res.json({ success: true, message: "Payment verified successfully!" });
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
