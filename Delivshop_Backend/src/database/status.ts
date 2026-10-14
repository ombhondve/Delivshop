import { checkDatabaseHealth, dbPool } from '../config/database.js';

export async function reportStatus(): Promise<void> {
  try {
    const status = await checkDatabaseHealth();
    console.log('Database Status:\n' + JSON.stringify(status, null, 2));

    await dbPool.end();

    if (!status.healthy || !status.schemaInitialized) {
      console.error('❌ Database health check failed or schema is not fully initialized.');
      process.exit(1);
    }

    console.log('✅ Database is healthy and migrations are up to date.');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error checking database status:', err?.message || err);
    try {
      await dbPool.end();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1] && (process.argv[1].endsWith('status.ts') || process.argv[1].endsWith('status.js'))) {
  reportStatus();
}
