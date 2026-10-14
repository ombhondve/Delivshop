import pg from 'pg';
import { ENV } from './env.js';

const { Pool } = pg;

const isCloudDatabase =
  ENV.NODE_ENV === 'production' ||
  ENV.NODE_ENV === 'preview' ||
  ENV.DATABASE_URL.includes('neon.tech') ||
  ENV.DATABASE_URL.includes('sslmode=require');

// Avoid conflicting SSL warnings between connectionString parameter and ssl option
const cleanConnectionString = isCloudDatabase
  ? ENV.DATABASE_URL.replace(/[?&]sslmode=[^&]+/, (match) => (match.startsWith('?') ? '?' : '')).replace(/\?$/, '')
  : ENV.DATABASE_URL;

export const dbPool = new Pool({
  connectionString: cleanConnectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isCloudDatabase ? { rejectUnauthorized: false } : false,
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
 * Check database connection status, verify expected schema tables, and inspect applied migrations.
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  schemaInitialized: boolean;
  usersTableExists: boolean;
  appliedMigrations: string[];
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const res = await dbPool.query(
      `SELECT 
         EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') as has_users,
         EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') as has_migrations`
    );
    const hasUsersTable = res.rows[0]?.has_users === true || res.rows[0]?.has_users === 't';
    const hasMigrationsTable = res.rows[0]?.has_migrations === true || res.rows[0]?.has_migrations === 't';

    let appliedMigrations: string[] = [];
    if (hasMigrationsTable) {
      const migRes = await dbPool.query<{ version: string }>(
        'SELECT version FROM schema_migrations ORDER BY version ASC'
      );
      appliedMigrations = migRes.rows.map((r) => r.version);
    }

    return {
      healthy: true,
      schemaInitialized: hasUsersTable && appliedMigrations.length > 0,
      usersTableExists: hasUsersTable,
      appliedMigrations,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      healthy: false,
      schemaInitialized: false,
      usersTableExists: false,
      appliedMigrations: [],
      error: 'Database connection unreachable',
    };
  }
}
