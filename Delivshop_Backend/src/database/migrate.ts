import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Locate SQL migrations directory across development (src/) and built (dist/) environments.
 */
export function resolveMigrationsDir(): string {
  const candidates = [
    path.join(__dirname, 'migrations'),
    path.join(__dirname, '../database/migrations'),
    path.join(__dirname, '../../src/database/migrations'),
    path.join(process.cwd(), 'src/database/migrations'),
    path.join(process.cwd(), 'dist/database/migrations'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const files = fs.readdirSync(candidate).filter((f) => f.endsWith('.sql'));
      if (files.length > 0) {
        return candidate;
      }
    }
  }

  throw new Error(
    `Migration files not found. Searched candidate paths:\n${candidates.map((c) => `  - ${c}`).join('\n')}`
  );
}

export interface MigrationSummary {
  success: boolean;
  appliedCount: number;
  totalMigrations: number;
  appliedFiles: string[];
}

export async function runMigrations(): Promise<MigrationSummary> {
  const migrationsDir = resolveMigrationsDir();
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    throw new Error(`Migrations directory found at ${migrationsDir}, but it contains no .sql files.`);
  }

  logger.info(`Starting database migrations using directory: ${migrationsDir}`);

  const client = await dbPool.connect();
  const appliedFiles: string[] = [];

  try {
    await client.query('BEGIN');

    // Advisory transaction lock (unique ID 74291) prevents concurrent migrations
    await client.query('SELECT pg_advisory_xact_lock(74291);');

    // Create schema_migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const file of files) {
      const version = file;
      const res = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
      if (res.rowCount === 0) {
        logger.info(`Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        appliedFiles.push(file);
        logger.info(`✅ Applied migration: ${file}`);
      } else {
        logger.info(`⏭️  Skipping already applied migration: ${file}`);
      }
    }

    // Post-migration validation: verify that the users table exists in the public schema
    const verifyRes = await client.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') as has_users"
    );
    if (!verifyRes.rows[0]?.has_users) {
      throw new Error('Migration scripts finished, but table "users" was not created in the public schema!');
    }

    await client.query('COMMIT');

    logger.info(`✅ Database migrations completed successfully. ${appliedFiles.length} new migration(s) applied.`);
    return {
      success: true,
      appliedCount: appliedFiles.length,
      totalMigrations: files.length,
      appliedFiles,
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to run database migrations:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Auto-run if executed directly via CLI: tsx src/database/migrate.ts or node dist/database/migrate.js
if (process.argv[1] && (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'))) {
  runMigrations()
    .then(async (summary) => {
      console.log(`✅ Migrations completed successfully. (${summary.appliedCount} new applied, ${summary.totalMigrations} total)`);
      await dbPool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Migration failed:', err.message);
      await dbPool.end();
      process.exit(1);
    });
}
