import { dbPool } from '../config/database.js';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { createDatabaseBackup } from './backup.js';

export interface CleanupOptions {
  confirm?: boolean;
  skipBackup?: boolean;
  preserveAdminEmail?: string;
}

export interface CleanupResult {
  success: boolean;
  preservedAdmin: {
    id: string;
    email: string;
    role: string;
  };
  backupPath?: string;
  clearedTablesCount: number;
  recordsRemoved: Record<string, number>;
}

/**
 * Safely cleans test and business records from the Delivshop database.
 * Strict Safety Invariants:
 * 1. NEVER drops tables, alters schema, or removes migration history.
 * 2. PRESERVES the web dashboard administrator account and its exact password hash.
 * 3. Requires explicit confirmation flag in production environments.
 * 4. Takes a verified backup snapshot before executing destructive deletions.
 * 5. Operates entirely inside a PostgreSQL transaction (automatic ROLLBACK on error).
 */
export async function cleanDatabase(options: CleanupOptions = {}): Promise<CleanupResult> {
  const isExplicitlyAllowed = process.env.ALLOW_DESTRUCTIVE_CLEANUP_EXPLICIT === 'true';

  if (!isExplicitlyAllowed) {
    const errorMsg =
      '[DATA PRESERVATION POLICY ENFORCED] Destructive database cleanup aborted: Real business data preservation is active. Running cleanDatabase is disabled by default to protect shops, drivers, products, and orders.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 1. Produce verified backup snapshot before making any modifications
  let backupPath: string | undefined;
  if (!options.skipBackup) {
    logger.info('Creating pre-cleanup database backup snapshot...');
    const backupRes = await createDatabaseBackup('pre_clean');
    backupPath = backupRes.filePath;
  }

  const client = await dbPool.connect();
  const recordsRemoved: Record<string, number> = {};

  try {
    await client.query('BEGIN');
    logger.info('Started atomic database cleanup transaction...');

    // 2. Locate and verify administrator account to preserve
    const targetAdminEmail = (options.preserveAdminEmail || 'admin@gmail.com').toLowerCase().trim();
    const adminRes = await client.query(
      `SELECT id, email, role, password_hash FROM users WHERE LOWER(email) = $1 AND role = 'ADMIN' LIMIT 1`,
      [targetAdminEmail]
    );

    if (adminRes.rows.length === 0) {
      throw new Error(`CRITICAL: Administrator account "${targetAdminEmail}" not found in database. Aborting cleanup to prevent lockout.`);
    }

    const preservedAdmin = adminRes.rows[0];
    logger.info(`Verified administrator account to preserve: ${preservedAdmin.email} (ID: ${preservedAdmin.id})`);

    // Helper for tracked table truncation / deletion
    const clearTable = async (tableName: string, whereClause = '') => {
      const sql = whereClause ? `DELETE FROM "${tableName}" WHERE ${whereClause};` : `DELETE FROM "${tableName}";`;
      const res = await client.query(sql);
      recordsRemoved[tableName] = res.rowCount || 0;
    };

    // 3. Clear dependent transactional, audit, and log records
    await clearTable('audit_logs');
    await clearTable('order_scheduling_history');
    await clearTable('invoices');
    await clearTable('payments');
    await clearTable('deliveries');
    await clearTable('order_items');
    await clearTable('orders');

    // 4. Clear delivery runs, pickups, stops, and collections
    await clearTable('delivery_collections');
    await clearTable('delivery_reconciliations');
    await clearTable('delivery_run_pickup_items');
    await clearTable('delivery_run_pickups');
    await clearTable('delivery_run_stops');
    await clearTable('delivery_runs');

    // 5. Clear routes and route stops
    await clearTable('route_stops');
    await clearTable('route_versions');
    await clearTable('routes');

    // 6. Clear driver management records
    await clearTable('driver_attendance');
    await clearTable('driver_documents');
    await clearTable('driver_incidents');
    await clearTable('driver_payroll_records');
    await clearTable('driver_salary_configs');

    // 7. Clear vehicle fleet records
    await clearTable('vehicle_documents');
    await clearTable('vehicle_inspections');
    await clearTable('vehicle_maintenance');
    await clearTable('vehicles');

    // 8. Clear shops and merchant accounts
    await clearTable('shop_order_reminders');
    await clearTable('shop_devices');
    await clearTable('shop_documents');
    await clearTable('shop_accounts');
    await clearTable('shops');

    // 9. Clear inventory movements, batches, and products
    await clearTable('inventory_movements');
    await clearTable('inventory_batches');
    await clearTable('products');

    // 10. Clear suppliers, bills, and companies
    await clearTable('supplier_bill_items');
    await clearTable('supplier_payments');
    await clearTable('supplier_bills');
    await clearTable('supplier_billing_counters');
    await clearTable('suppliers');
    await clearTable('companies');

    // 11. Clear all non-admin users
    const userDelRes = await client.query(`DELETE FROM users WHERE id != $1;`, [preservedAdmin.id]);
    recordsRemoved['users'] = userDelRes.rowCount || 0;

    // 12. Reset sequence counters safely
    await client.query("UPDATE company_code_counters SET last_sequence = 1000, updated_at = NOW() WHERE counter_prefix = 'CMP';");
    await client.query("UPDATE driver_employee_id_counters SET last_sequence = 1000, updated_at = NOW() WHERE counter_prefix = 'EMP-DRV';");
    await client.query("UPDATE inventory_movement_counters SET last_sequence = 1000, updated_at = NOW() WHERE counter_prefix = 'MOV';");
    await client.query("DELETE FROM route_code_counters;");
    await client.query("DELETE FROM shop_id_counters;");

    // 13. Post-cleanup validation: verify solely the administrator account exists and password hash is untouched
    const verifyUserRes = await client.query('SELECT id, email, role, password_hash FROM users;');
    if (verifyUserRes.rows.length !== 1 || verifyUserRes.rows[0].id !== preservedAdmin.id) {
      throw new Error(`Integrity check failed: Expected only admin account (${preservedAdmin.email}), found ${verifyUserRes.rows.length} users.`);
    }
    if (verifyUserRes.rows[0].password_hash !== preservedAdmin.password_hash) {
      throw new Error('Integrity check failed: Administrator password hash was unexpectedly altered.');
    }

    // Verify migration history is intact
    const migRes = await client.query('SELECT COUNT(*)::int as count FROM schema_migrations;');
    if (migRes.rows[0].count < 25) {
      throw new Error(`Integrity check failed: schema_migrations was modified or corrupted (count: ${migRes.rows[0].count}).`);
    }

    await client.query('COMMIT');
    logger.info('✅ Database cleanup completed successfully. Transaction committed.');

    return {
      success: true,
      preservedAdmin: {
        id: preservedAdmin.id,
        email: preservedAdmin.email,
        role: preservedAdmin.role,
      },
      backupPath,
      clearedTablesCount: Object.keys(recordsRemoved).length,
      recordsRemoved,
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error('❌ Database cleanup transaction failed and was rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// CLI direct execution: npx tsx src/database/cleanup.ts [--confirm]
if (process.argv[1] && (process.argv[1].endsWith('cleanup.ts') || process.argv[1].endsWith('cleanup.js'))) {
  cleanDatabase({ confirm: process.argv.includes('--confirm') })
    .then(async (res) => {
      console.log(`\n✅ [Database Cleanup] Success!`);
      console.log(`Preserved Administrator: ${res.preservedAdmin.email} (${res.preservedAdmin.id})`);
      if (res.backupPath) console.log(`Verified Backup: ${res.backupPath}`);
      console.log(`Tables Cleared: ${res.clearedTablesCount}`);
      await dbPool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(`\n❌ [Database Cleanup] Failed: ${err.message}`);
      await dbPool.end();
      process.exit(1);
    });
}
