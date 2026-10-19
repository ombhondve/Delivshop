import fs from 'fs';
import path from 'path';
import { dbPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface BackupResult {
  success: boolean;
  filePath: string;
  totalTables: number;
  totalRows: number;
  timestamp: string;
}

/**
 * Creates a verified, recoverable snapshot of all database tables.
 * Never prints or leaks credentials to logs or stdout.
 */
export async function createDatabaseBackup(customLabel?: string): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const label = customLabel ? `_${customLabel}` : '';
  const backupDir = path.join(process.cwd(), 'storage', 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, `db_backup${label}_${timestamp}.json`);

  const tablesRes = await dbPool.query<{ table_name: string }>(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  const tables = tablesRes.rows.map((r) => r.table_name);

  const backupData: {
    metadata: {
      timestamp: string;
      totalTables: number;
      tableCounts: Record<string, number>;
    };
    tables: Record<string, any[]>;
  } = {
    metadata: {
      timestamp: new Date().toISOString(),
      totalTables: tables.length,
      tableCounts: {},
    },
    tables: {},
  };

  let totalRows = 0;

  for (const table of tables) {
    const res = await dbPool.query(`SELECT * FROM "${table}";`);
    backupData.tables[table] = res.rows;
    backupData.metadata.tableCounts[table] = res.rows.length;
    totalRows += res.rows.length;
  }

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');

  // Verify backup integrity by reading and checking row counts
  const readBack = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
  let verifiedRows = 0;
  for (const table of tables) {
    if (!readBack.tables[table] || readBack.tables[table].length !== backupData.metadata.tableCounts[table]) {
      throw new Error(`Backup verification failed on table: ${table}`);
    }
    verifiedRows += readBack.tables[table].length;
  }

  if (verifiedRows !== totalRows) {
    throw new Error(`Backup integrity mismatch: ${totalRows} rows exported vs ${verifiedRows} verified.`);
  }

  logger.info(`✅ Database backup verified and saved to: ${backupFilePath} (${totalRows} total rows across ${tables.length} tables)`);

  return {
    success: true,
    filePath: backupFilePath,
    totalTables: tables.length,
    totalRows,
    timestamp: backupData.metadata.timestamp,
  };
}

// CLI direct execution
if (process.argv[1] && (process.argv[1].endsWith('backup.ts') || process.argv[1].endsWith('backup.js'))) {
  createDatabaseBackup()
    .then(async (res) => {
      console.log(`✅ [Database Backup] Successfully created snapshot at: ${res.filePath}`);
      await dbPool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(`❌ [Database Backup] Failed: ${err.message}`);
      await dbPool.end();
      process.exit(1);
    });
}
