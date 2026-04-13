-- Create database (run separately if needed)
CREATE DATABASE smart_parking;

-- Connect to DB
-- \c smart_parking

-- USERS
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'customer',
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- ZONES
CREATE TABLE zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(10) UNIQUE NOT NULL,
  description VARCHAR(255),
  total_spots INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PARKING SPOTS
CREATE TABLE parking_spots (
  id SERIAL PRIMARY KEY,
  spot_number VARCHAR(10) UNIQUE NOT NULL,
  zone_id INT REFERENCES zones(id) ON DELETE CASCADE,
  spot_type VARCHAR(20) DEFAULT 'regular',
  is_occupied BOOLEAN DEFAULT FALSE,
  is_reserved BOOLEAN DEFAULT FALSE,
  hourly_rate NUMERIC(10,2) DEFAULT 5.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VEHICLES
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  license_plate VARCHAR(20) UNIQUE NOT NULL,
  vehicle_type VARCHAR(20) DEFAULT 'car',
  make VARCHAR(50),
  model VARCHAR(50),
  color VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PARKING SESSIONS
CREATE TABLE parking_sessions (
  id SERIAL PRIMARY KEY,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  spot_id INT REFERENCES parking_spots(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMP,
  duration_minutes INT,
  total_amount NUMERIC(10,2),
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(20) DEFAULT 'cash',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RESERVATIONS
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  spot_id INT REFERENCES parking_spots(id) ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  total_amount NUMERIC(10,2),
  payment_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI PREDICTIONS
CREATE TABLE ai_predictions (
  id SERIAL PRIMARY KEY,
  zone_id INT REFERENCES zones(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL,
  hour INT NOT NULL,
  predicted_occupancy NUMERIC(5,2),
  actual_occupancy NUMERIC(5,2),
  confidence_score NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  details JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INSERT ZONES
INSERT INTO zones (name, description, total_spots) VALUES
('A', 'Main Entrance Zone', 12),
('B', 'North Wing Zone', 12),
('C', 'South Wing Zone', 12),
('D', 'EV Charging Zone', 12);

-- INSERT PARKING SPOTS (PostgreSQL version)
INSERT INTO parking_spots (spot_number, zone_id, spot_type, hourly_rate)
SELECT 
  z.name || '-' || LPAD(n::text, 2, '0'),
  z.id,
  CASE 
    WHEN z.name = 'D' THEN 'electric'
    WHEN n <= 2 THEN 'electric'
    ELSE 'regular'
  END,
  CASE 
    WHEN z.name = 'D' THEN 7.00
    ELSE 5.00
  END
FROM zones z,
generate_series(1,12) AS n;

-- ADMIN USER
INSERT INTO users (username, email, password_hash, full_name, role, phone)
VALUES (
  'admin',
  'admin@smartpark.com',
  '$2a$10$rQZ9vXJxL8K5qN3mH7pO2eYwZ8xK4jL6mN9oP1qR3sT5uV7wX9yZ',
  'System Administrator',
  'admin',
  '555-0000'
);