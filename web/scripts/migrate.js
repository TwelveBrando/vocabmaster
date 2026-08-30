import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(await readFile(new URL('../db/migrations/001_initial.sql', import.meta.url), 'utf8'));
  console.log('Migration 001_initial completed.');
} finally {
  await pool.end();
}
