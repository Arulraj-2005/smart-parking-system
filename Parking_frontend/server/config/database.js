import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',   // ✅ Docker service name
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'parking_db',
});

// Test connection with retry
const connectDB = async () => {
  let retries = 5;

  while (retries) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ PostgreSQL connected successfully');
      break;
    } catch (err) {
      console.log('⏳ Waiting for DB...');
      retries--;
      await new Promise(res => setTimeout(res, 5000));
    }
  }

  if (retries === 0) {
    console.error('❌ Database connection failed');
  }
};

connectDB();

export default pool;