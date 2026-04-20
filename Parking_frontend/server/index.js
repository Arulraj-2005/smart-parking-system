import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server folder
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
<<<<<<< HEAD
=======
import dotenv from 'dotenv';

dotenv.config();
>>>>>>> 83ca3e62d2e45ac5ed7bf6adbd5938450b579278

console.log('🔧 Loading modules...');

// Import routes
let authRoutes, parkingRoutes, vehicleRoutes, analyticsRoutes, authenticateToken, adminRoutes, paymentRoutes;

try {
  const authModule = await import('./routes/auth.js');
  authRoutes = authModule.default;
  console.log('✅ Auth routes loaded');
} catch (err) {
  console.error('❌ Failed to load auth routes:', err.message);
  process.exit(1);
}

try {
  const parkingModule = await import('./routes/parking.js');
  parkingRoutes = parkingModule.default;
  console.log('✅ Parking routes loaded');
} catch (err) {
  console.error('❌ Failed to load parking routes:', err.message);
  process.exit(1);
}

try {
  const vehicleModule = await import('./routes/vehicles.js');
  vehicleRoutes = vehicleModule.default;
  console.log('✅ Vehicle routes loaded');
} catch (err) {
  console.error('❌ Failed to load vehicle routes:', err.message);
  process.exit(1);
}

try {
  const analyticsModule = await import('./routes/analytics.js');
  analyticsRoutes = analyticsModule.default;
  console.log('✅ Analytics routes loaded');
} catch (err) {
  console.error('❌ Failed to load analytics routes:', err.message);
  process.exit(1);
}

try {
  const authMiddleware = await import('./middleware/auth.js');
  authenticateToken = authMiddleware.authenticateToken;
  console.log('✅ Auth middleware loaded');
} catch (err) {
  console.error('❌ Failed to load auth middleware:', err.message);
  process.exit(1);
}

try {
  const adminModule = await import('./routes/admin.js');
  adminRoutes = adminModule.default;
  console.log('✅ Admin routes loaded');
} catch (err) {
  console.error('❌ Failed to load admin routes:', err.message);
  process.exit(1);
}

try {
  const paymentModule = await import('./routes/payment.js');
  paymentRoutes = paymentModule.default;
  console.log('✅ Payment routes loaded');
} catch (err) {
  console.error('❌ Failed to load payment routes:', err.message);
  process.exit(1);
}

<<<<<<< HEAD
=======
// ✅ CREATE APP HERE - AFTER all imports
>>>>>>> 83ca3e62d2e45ac5ed7bf6adbd5938450b579278
const app = express();
const PORT = process.env.PORT || 5000;

// Debug: Log environment variables (remove after debugging)
console.log('DB_HOST from env:', process.env.DB_HOST);
console.log('RAZORPAY_KEY_ID exists:', !!process.env.RAZORPAY_KEY_ID);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parking', authenticateToken, parkingRoutes);
app.use('/api/vehicles', authenticateToken, vehicleRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/payment', authenticateToken, paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Smart Parking API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
