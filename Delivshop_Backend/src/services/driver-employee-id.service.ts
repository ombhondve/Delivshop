import pg from 'pg';
import { dbPool } from '../config/database.js';

const PREFIX = 'EMP-DRV';

/**
 * Concurrency-safe atomic generation of driver employee IDs (e.g. EMP-DRV-1006)
 */
export async function generateDriverEmployeeId(client?: pg.PoolClient): Promise<string> {
  const runner = client || dbPool;

  const queryText = `
    INSERT INTO driver_employee_id_counters (counter_prefix, last_sequence, updated_at)
    VALUES ($1, 1006, NOW())
    ON CONFLICT (counter_prefix) DO UPDATE
    SET last_sequence = driver_employee_id_counters.last_sequence + 1,
        updated_at = NOW()
    RETURNING last_sequence;
  `;

  const res = await runner.query<{ last_sequence: number }>(queryText, [PREFIX]);
  let sequence = res.rows[0]?.last_sequence || 1006;
  let empId = `${PREFIX}-${sequence}`;

  // Fallback safety loop to guarantee no collisions even if manual accounts exist
  let exists = await runner.query('SELECT 1 FROM users WHERE employee_id = $1', [empId]);
  while (exists.rows.length > 0) {
    const adv = await runner.query<{ last_sequence: number }>(
      `UPDATE driver_employee_id_counters
       SET last_sequence = last_sequence + 1,
           updated_at = NOW()
       WHERE counter_prefix = $1
       RETURNING last_sequence`,
      [PREFIX]
    );
    sequence = adv.rows[0].last_sequence;
    empId = `${PREFIX}-${sequence}`;
    exists = await runner.query('SELECT 1 FROM users WHERE employee_id = $1', [empId]);
  }

  return empId;
}
