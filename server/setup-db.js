import 'dotenv/config';
import fs from 'fs';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
});

await conn.query(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
console.log('Database "pulse" is ready');
await conn.end();