// FORCE DEPLOY - WORKING VERSION v5
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Loading modules...');

// Try to import routes with error handling
let authRoutes, parkingRoutes, vehicleRoutes, analyticsRoutes, authenticateToken;

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

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parking', authenticateToken, parkingRoutes);
app.use('/api/vehicles', authenticateToken, vehicleRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);

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