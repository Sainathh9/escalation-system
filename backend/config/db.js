import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
console.log(`[DB] Pool initializing → host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

export default pool; // Use export default instead of module.exports