import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

// Returns rows for SELECT, or the result header (insertId, affectedRows) for writes
export async function q(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return result;
}
