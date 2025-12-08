import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL, // Use Cloud SQL proxy or direct URL
      max: 20,
    });
  }
  return pool;
}