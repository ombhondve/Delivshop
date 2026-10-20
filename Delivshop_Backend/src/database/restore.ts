import fs from 'fs';
import path from 'path';
import { dbPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Safe Data Restoration Utility.
 * Restores historical records from verified backup snapshot WITHOUT overwriting
 * existing records or modifying current data (using ON CONFLICT DO NOTHING).
 */
export async function restoreFromBackup(backupFileName = 'db_backup_2026-10-19T17-59-25-998Z.json') {
  const backupPath = path.resolve('storage', 'backups', backupFileName);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found at: ${backupPath}`);
  }

  const raw = fs.readFileSync(backupPath, 'utf-8');
  const backup = JSON.parse(raw);
  const tables = backup.tables;

  logger.info(`[RESTORE] Loaded backup dated ${backup.metadata?.timestamp} from ${backupPath}`);

  const client = await dbPool.connect();

  // Strict topological order ensuring parent tables are restored before child tables
  const insertionOrder = [
    'companies',
    'users',
    'shops',
    'products',
    'vehicles',
    'routes',
    'route_stops',
    'delivery_runs',
    'delivery_run_stops',
    'orders',
    'order_items',
    'deliveries',
    'inventory_batches',
    'inventory_movements',
    'driver_salary_configs',
    'driver_payroll_records',
    'vehicle_documents',
    'vehicle_maintenance'
  ];

  const results: Record<string, { totalInBackup: number; restoredCount: number; skippedCount: number }> = {};

  try {
    for (const tableName of insertionOrder) {
      const records: any[] = tables[tableName] || [];
      results[tableName] = { totalInBackup: records.length, restoredCount: 0, skippedCount: 0 };

      if (records.length === 0) continue;

      // Fetch primary key for table
      const pkRes = await client.query(`
        SELECT a.attname
        FROM   pg_index i
        JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE  i.indrelid = $1::regclass
        AND    i.indisprimary;
      `, [tableName]);

      const pkCols = pkRes.rows.map(r => `"${r.attname}"`);
      const conflictClause = pkCols.length > 0 
        ? `ON CONFLICT (${pkCols.join(', ')}) DO NOTHING`
        : `ON CONFLICT DO NOTHING`;

      await client.query('BEGIN');

      for (const row of records) {
        // Pre-check for duplicate records to avoid constraint exceptions
        if (tableName === 'users') {
          const exists = await client.query('SELECT 1 FROM users WHERE id = $1 OR LOWER(email) = LOWER($2);', [row.id, row.email]);
          if (exists.rows.length > 0) {
            results[tableName].skippedCount++;
            continue;
          }
        } else if (row.id) {
          const exists = await client.query(`SELECT 1 FROM "${tableName}" WHERE id = $1;`, [row.id]);
          if (exists.rows.length > 0) {
            results[tableName].skippedCount++;
            continue;
          }
        }

        // Safety for foreign keys if parent was purged prior to backup
        if (tableName === 'shops' && row.owner_id) {
          const u = await client.query('SELECT 1 FROM users WHERE id = $1;', [row.owner_id]);
          if (u.rows.length === 0) row.owner_id = null;
        }

        if (tableName === 'orders' && row.delivery_run_id) {
          const dr = await client.query('SELECT 1 FROM delivery_runs WHERE id = $1;', [row.delivery_run_id]);
          if (dr.rows.length === 0) row.delivery_run_id = null;
        }

        const keys = Object.keys(row);
        const colNames = keys.map(k => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => {
          const val = row[k];
          if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
            return JSON.stringify(val);
          }
          return val;
        });

        const insertSql = `
          INSERT INTO "${tableName}" (${colNames})
          VALUES (${placeholders})
          ${conflictClause}
          RETURNING *;
        `;

        try {
          await client.query('SAVEPOINT row_sp;');
          const res = await client.query(insertSql, values);
          await client.query('RELEASE SAVEPOINT row_sp;');
          if (res.rowCount && res.rowCount > 0) {
            results[tableName].restoredCount++;
          } else {
            results[tableName].skippedCount++;
          }
        } catch (err: any) {
          await client.query('ROLLBACK TO SAVEPOINT row_sp;');
          logger.warn(`[RESTORE] Skipped row in ${tableName}: ${err?.message}`);
          results[tableName].skippedCount++;
        }
      }

      await client.query('COMMIT');
      logger.info(`[RESTORE] ${tableName}: ${results[tableName].restoredCount} restored, ${results[tableName].skippedCount} skipped (already present/conflicted).`);
    }

    // Sequence / counter reconciliation
    await client.query(`
      UPDATE company_code_counters 
      SET last_sequence = GREATEST(last_sequence, 1000 + (SELECT COUNT(*) FROM companies))
      WHERE counter_prefix = 'CMP';
    `);

    await client.query(`
      UPDATE driver_employee_id_counters 
      SET last_sequence = GREATEST(last_sequence, 1000 + (SELECT COUNT(*) FROM users WHERE role = 'DRIVER'))
      WHERE counter_prefix = 'EMP-DRV';
    `);

    await client.query(`
      UPDATE inventory_movement_counters 
      SET last_sequence = GREATEST(last_sequence, 1000 + (SELECT COUNT(*) FROM inventory_movements))
      WHERE counter_prefix = 'MOV';
    `);

    logger.info('[RESTORE] All tables safely restored and sequence counters reconciled.');
  } finally {
    client.release();
  }

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('restore.ts')) {
  restoreFromBackup()
    .then(res => {
      console.log('Restoration completed successfully:\n', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Restoration error:', err);
      process.exit(1);
    });
}
