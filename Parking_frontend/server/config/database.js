import pkg from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

const { Pool } = pkg;

// Force IPv4 resolution for Supabase connection
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  // If options is a function, it's the callback (no options provided)
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  // Force IPv4 for database host
  if (hostname === (process.env.DB_HOST || 'postgres')) {
    options.family = 4;
  }
  
  return originalLookup(hostname, options, callback);
};

console.log('📊 Initializing database connection...');
console.log('DB_HOST:', process.env.DB_HOST || 'postgres');
console.log('DB_NAME:', process.env.DB_NAME || 'smart_parking');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'smart_parking',
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection with async/await for better error handling
const testConnection = async () => {
  let retries = 5;
  
  while (retries) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ PostgreSQL connected successfully');
      return true;
    } catch (err) {
      console.log(`⏳ Database connection attempt failed, ${retries - 1} retries left...`);
      console.error('Connection error:', err.message);
      retries--;
      if (retries === 0) {
        console.error('❌ Database connection failed after all retries');
      } else {
        await new Promise(res => setTimeout(res, 5000));
      }
    }
  }
  return false;
};

// Run the connection test
testConnection();

export default pool;