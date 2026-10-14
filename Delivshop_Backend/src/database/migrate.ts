import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbPool, query } from '../config/database.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');

    // Create schema_migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      await client.query('COMMIT');
      return;
    }

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const version = file;
      const res = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
      if (res.rowCount === 0) {
        logger.info(`Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        logger.info(`✅ Applied migration: ${file}`);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Failed to run database migrations:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Auto-run if executed directly via CLI: tsx src/database/migrate.ts or node dist/database/migrate.js
if (process.argv[1] && (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'))) {
  runMigrations()
    .then(async () => {
      console.log('✅ Migrations completed successfully.');
      await dbPool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Migration failed:', err);
      await dbPool.end();
      process.exit(1);
    });
}
