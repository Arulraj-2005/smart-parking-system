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
            await pool.query(
                `UPDATE parking_sessions 
                 SET payment_status = 'paid', payment_method = 'razorpay'
                 WHERE id = $1`,
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