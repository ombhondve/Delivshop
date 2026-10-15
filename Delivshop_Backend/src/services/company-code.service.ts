import pg from 'pg';
import { dbPool } from '../config/database.js';

export async function generateCompanyCode(
  client?: pg.PoolClient,
  prefix = 'CMP'
): Promise<string> {
  const runner = client || dbPool;

  const queryText = `
    INSERT INTO company_code_counters (counter_prefix, last_sequence, updated_at)
    VALUES ($1, 1001, NOW())
    ON CONFLICT (counter_prefix) DO UPDATE
    SET last_sequence = company_code_counters.last_sequence + 1,
        updated_at = NOW()
    RETURNING last_sequence;
  `;

  const res = await runner.query<{ last_sequence: number }>(queryText, [prefix]);
  const sequence = res.rows[0].last_sequence;

  return `${prefix}-${sequence}`;
}
