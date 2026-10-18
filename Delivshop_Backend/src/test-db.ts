import { dbPool } from './config/database.js';

async function main() {
  try {
    const res = await dbPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    console.log('Tables:', res.rows.map((r: any) => r.table_name));

    const checkBatches = await dbPool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_batches');"
    );
    console.log('inventory_batches table exists:', checkBatches.rows[0].exists);

    const checkMovements = await dbPool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_movements');"
    );
    console.log('inventory_movements table exists:', checkMovements.rows[0].exists);

    const checkMigrations = await dbPool.query(
      "SELECT version FROM schema_migrations ORDER BY version;"
    );
    console.log('Applied migrations:', checkMigrations.rows.map((r: any) => r.version));
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await dbPool.end();
  }
}

main();
