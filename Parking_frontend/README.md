# AI-Enhanced Smart Parking Slot Booking System

A full-stack web application for managing parking slots with AI-enhanced features, built with React, Node.js, Express, and MySQL.

## Features

### Frontend (React + Vite + Tailwind CSS)
- **JWT Authentication**: Secure login/register system
- **Dashboard**: Real-time statistics and active sessions
- **Parking Map**: Interactive zone-based parking spot visualization
- **Vehicle Management**: Check-in/check-out functionality
- **Analytics**: Occupancy rates, zone distribution, and revenue tracking
- **Responsive Design**: Works on desktop and mobile devices

### Backend (Node.js + Express)
- **RESTful API**: Clean API architecture
- **JWT Authentication**: Secure token-based auth
- **Role-based Access**: Admin, staff, and customer roles
- **MySQL Database**: Relational data storage
- **Input Validation**: Express-validator for request validation
- **Error Handling**: Comprehensive error middleware

### Database Schema
- Users (with authentication)
- Parking Zones
- Parking Spots (regular, electric, handicapped, motorcycle)
- Vehicles
- Parking Sessions
- Reservations
- AI Predictions (for future ML integration)
- Audit Logs

## Project Structure

```
smart-parking/
├── src/                    # React frontend
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Entry point
│   └── index.css          # Tailwind imports
├── server/                 # Node.js backend
│   ├── index.js           # Server entry point
│   ├── config/
│   │   ├── database.js    # MySQL connection pool
│   │   └── schema.sql     # Database schema
│   ├── middleware/
│   │   └── auth.js        # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js        # Authentication routes
│   │   ├── parking.js     # Parking management routes
│   │   ├── vehicles.js    # Vehicle management routes
│   │   └── analytics.js   # Analytics routes
│   └── .env               # Environment variables
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MySQL 8+ installed and running
- npm or yarn package manager

### 1. Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Run the schema
source server/config/schema.sql
```

### 2. Backend Setup

```bash
# Navigate to project root
cd smart-parking

# Install dependencies (already done)
npm install

# Configure environment variables
# Edit server/.env with your database credentials

# Start the backend server
node server/index.js
```

### 3. Frontend Setup

```bash
# In a separate terminal, start the frontend
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Parking
- `GET /api/parking/zones` - Get all zones
- `GET /api/parking/spots` - Get all spots (with filters)
- `GET /api/parking/spots/:id` - Get single spot
- `POST /api/parking/spots/:id/reserve` - Reserve a spot
- `GET /api/parking/reservations/my` - Get user's reservations
- `DELETE /api/parking/reservations/:id` - Cancel reservation

### Vehicles
- `GET /api/vehicles` - Get all vehicles (admin)
- `GET /api/vehicles/my` - Get user's vehicles
- `POST /api/vehicles` - Add vehicle
- `POST /api/vehicles/check-in` - Check-in vehicle
- `POST /api/vehicles/check-out` - Check-out vehicle
- `GET /api/vehicles/sessions/active` - Get active sessions

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/revenue/weekly` - Weekly revenue
- `GET /api/analytics/vehicles/distribution` - Vehicle type distribution
- `GET /api/analytics/peak-hours` - Peak hours analysis
- `GET /api/analytics/zones/occupancy` - Zone occupancy
- `GET /api/analytics/predictions` - AI occupancy predictions
- `GET /api/analytics/activity` - Recent activity

## Default Credentials

After running the schema, you can login with:
- **Username**: admin
- **Password**: admin123

(Note: You'll need to hash the password properly or create a new user through the registration endpoint)

## Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_parking

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

## Technologies Used

### Frontend
- React 19
- Vite
- TypeScript
- Tailwind CSS 4

### Backend
- Node.js
- Express
- MySQL2 (with connection pooling)
- JWT (jsonwebtoken)
- bcryptjs (password hashing)
- express-validator

## Future Enhancements

1. **AI/ML Integration**
   - Occupancy prediction using historical data
   - Dynamic pricing based on demand
   - Smart spot recommendations

2. **Mobile App**
   - React Native mobile application
   - QR code scanning for check-in/out

3. **Payment Integration**
   - Stripe/PayPal integration
   - Subscription plans

4. **Real-time Features**
   - WebSocket for live updates
   - Push notifications

5. **Advanced Analytics**
   - Revenue forecasting
   - Customer behavior analysis
   - Peak time predictions

## License

MIT License - feel free to use this project for learning or commercial purposes.
