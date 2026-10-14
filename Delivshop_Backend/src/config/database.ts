import pg from 'pg';
import { ENV } from './env.js';

const { Pool } = pg;

export const dbPool = new Pool({
  connectionString: ENV.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl:
    ENV.NODE_ENV === 'production' ||
    ENV.NODE_ENV === 'preview' ||
    ENV.DATABASE_URL.includes('neon.tech') ||
    ENV.DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
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
/**
 * Check database connection status and verify expected schema tables.
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  schemaInitialized: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const res = await dbPool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') as has_users"
    );
    const hasUsersTable = res.rows[0]?.has_users === true || res.rows[0]?.has_users === 't';
    return {
      healthy: true,
      schemaInitialized: hasUsersTable,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      healthy: false,
      schemaInitialized: false,
      error: 'Database connection unreachable',
    };
  }
}
