import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',  // ✅ FIXED
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'parking_db',
  port: process.env.DB_PORT || 5432,
});

// Retry logic (VERY IMPORTANT)
const connectDB = async () => {
  let retries = 5;

  while (retries) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ PostgreSQL Connected');
      break;
    } catch (err) {
      console.log('⏳ Waiting for DB...');
      retries--;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

connectDB();

export default pool;