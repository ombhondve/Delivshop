import { afterAll } from 'vitest';
import { dbPool } from '../src/config/database.js';

const PRESERVED_ADMIN_EMAIL = 'admin@gmail.com';

/**
 * Global test teardown safeguard.
 * Ensures automated test runs clean up all test-generated records upon test suite completion,
 * leaving only the production/seeded administrator account.
 */
afterAll(async () => {
  try {
    // 1. Purge test audit logs
    await dbPool.query('DELETE FROM audit_logs;');

    // 2. Purge test orders, deliveries, and scheduling history
    await dbPool.query('DELETE FROM order_scheduling_history;');
    await dbPool.query('DELETE FROM invoices;');
    await dbPool.query('DELETE FROM payments;');
    await dbPool.query('DELETE FROM deliveries;');
    await dbPool.query('DELETE FROM order_items;');
    await dbPool.query('DELETE FROM orders;');

    // 3. Purge test delivery runs, pickups, stops, and collections
    await dbPool.query('DELETE FROM delivery_collections;');
    await dbPool.query('DELETE FROM delivery_reconciliations;');
    await dbPool.query('DELETE FROM delivery_run_pickup_items;');
    await dbPool.query('DELETE FROM delivery_run_pickups;');
    await dbPool.query('DELETE FROM delivery_run_stops;');
    await dbPool.query('DELETE FROM delivery_runs;');

    // 4. Purge test route stops, route versions, and routes
    await dbPool.query('DELETE FROM route_stops;');
    await dbPool.query('DELETE FROM route_versions;');
    await dbPool.query('DELETE FROM routes;');

    // 5. Purge test driver management records
    await dbPool.query('DELETE FROM driver_attendance;');
    await dbPool.query('DELETE FROM driver_documents;');
    await dbPool.query('DELETE FROM driver_incidents;');
    await dbPool.query('DELETE FROM driver_salary_payments;');
    await dbPool.query('DELETE FROM driver_payroll_records;');
    await dbPool.query('DELETE FROM driver_salary_configs;');

    // 6. Purge test vehicles and fleet records
    await dbPool.query('DELETE FROM vehicle_documents;');
    await dbPool.query('DELETE FROM vehicle_inspections;');
    await dbPool.query('DELETE FROM vehicle_maintenance;');
    await dbPool.query('DELETE FROM vehicles;');

    // 7. Purge test shops and merchant accounts
    await dbPool.query('DELETE FROM shop_order_reminders;');
    await dbPool.query('DELETE FROM shop_devices;');
    await dbPool.query('DELETE FROM shop_documents;');
    await dbPool.query('DELETE FROM shop_accounts;');
    await dbPool.query('DELETE FROM shops;');

    // 8. Purge test inventory and products
    await dbPool.query('DELETE FROM inventory_movements;');
    await dbPool.query('DELETE FROM inventory_batches;');
    await dbPool.query('DELETE FROM products;');

    // 9. Purge test suppliers, bills, and companies
    await dbPool.query('DELETE FROM supplier_bill_items;');
    await dbPool.query('DELETE FROM supplier_payments;');
    await dbPool.query('DELETE FROM supplier_bills;');
    await dbPool.query('DELETE FROM supplier_billing_counters;');
    await dbPool.query('DELETE FROM suppliers;');
    await dbPool.query('DELETE FROM companies;');

    // 10. Purge all test users except the administrator
    await dbPool.query('DELETE FROM users WHERE LOWER(email) != $1;', [PRESERVED_ADMIN_EMAIL]);

    // 11. Reset counter sequences
    await dbPool.query("UPDATE company_code_counters SET last_sequence = 1000, updated_at = NOW() WHERE counter_prefix = 'CMP';");
    await dbPool.query("UPDATE driver_employee_id_counters SET last_sequence = 1000, updated_at = NOW() WHERE counter_prefix = 'EMP-DRV';");
    await dbPool.query("UPDATE inventory_movement_counters SET last_sequence = 1000, updated_at = NOW() WHERE counter_prefix = 'MOV';");
    await dbPool.query('DELETE FROM route_code_counters;');
    await dbPool.query('DELETE FROM shop_id_counters;');

  } catch {
    // Teardown safety fallback: do not crash test runner if client was already closed
  }
});
