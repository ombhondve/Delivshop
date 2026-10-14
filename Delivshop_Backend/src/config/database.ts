import pg from 'pg';
import { ENV } from './env.js';

const { Pool } = pg;

export const dbPool = new Pool({
  connectionString: ENV.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: ENV.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

dbPool.on('error', (err) => {
  // Centralized log, avoid crashing unhandled
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Execute a parameterized database query.
 * All dynamic parameters MUST be passed through the `params` array to prevent SQL injection.
 */
export async function query<T extends pg.QueryResultRow = any>(sql: string, params: any[] = []): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const res = await dbPool.query<T>(sql, params);

  const duration = Date.now() - start;
  if (ENV.NODE_ENV === 'development') {
    // Parameterized queries logged without values to prevent sensitive data logging
    console.log(`[DB Query] Duration: ${duration}ms | Rows: ${res.rowCount}`);
  }
  return res;
}

/**
 * Check database connection status for health checks.
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await dbPool.query('SELECT 1');
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { healthy: false, error: 'Database connection unreachable' };
  }
}
