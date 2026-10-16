import pg from 'pg';
import { dbPool } from '../config/database.js';

export interface RouteCodeResult {
  routeCode: string;
  generationDate: string; // YYYY-MM-DD
  sequenceNumber: number;
}

/**
 * Format date in the business's configured timezone (Asia/Kolkata UTC+05:30).
 * Returns { dateKey: 'YYYYMMDD', sqlDate: 'YYYY-MM-DD' }
 */
export function getRouteBusinessDateParts(
  date: Date = new Date(),
  timeZone = 'Asia/Kolkata'
): {
  dateKey: string;
  sqlDate: string;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // en-CA formats as YYYY-MM-DD
  const parts = formatter.format(date);
  const sqlDate = parts; // YYYY-MM-DD
  const dateKey = parts.replace(/-/g, ''); // YYYYMMDD

  return { dateKey, sqlDate };
}

/**
 * Generate a concurrency-safe atomic Route Code in the standard format RTE-YYYYMMDD-001.
 * If a PoolClient is provided (e.g. within an active transaction), it runs within that transaction lock.
 */
export async function generateRouteCode(
  client?: pg.PoolClient,
  customDate?: Date,
  timeZone = 'Asia/Kolkata'
): Promise<string> {
  const { dateKey, sqlDate } = getRouteBusinessDateParts(customDate, timeZone);
  const runner = client || dbPool;

  // Concurrency-safe atomic counter query with upsert and row locking
  const queryText = `
    INSERT INTO route_code_counters (counter_date, last_sequence, updated_at)
    VALUES ($1, 1, NOW())
    ON CONFLICT (counter_date) DO UPDATE
    SET last_sequence = route_code_counters.last_sequence + 1,
        updated_at = NOW()
    RETURNING last_sequence;
  `;

  const res = await runner.query(queryText, [sqlDate]);
  let sequenceNumber = Number(res.rows[0].last_sequence);
  let paddedSequence = String(sequenceNumber).padStart(3, '0');
  let routeCode = `RTE-${dateKey}-${paddedSequence}`;

  // Safety loop: in the unlikely event a matching route_code already exists (e.g. from manual seed),
  // advance sequence until a guaranteed unique route_code is obtained.
  let exists = await runner.query('SELECT 1 FROM routes WHERE route_code = $1', [routeCode]);
  while (exists.rows.length > 0) {
    const advanceRes = await runner.query(
      `UPDATE route_code_counters
       SET last_sequence = last_sequence + 1,
           updated_at = NOW()
       WHERE counter_date = $1
       RETURNING last_sequence`,
      [sqlDate]
    );
    sequenceNumber = Number(advanceRes.rows[0].last_sequence);
    paddedSequence = String(sequenceNumber).padStart(3, '0');
    routeCode = `RTE-${dateKey}-${paddedSequence}`;
    exists = await runner.query('SELECT 1 FROM routes WHERE route_code = $1', [routeCode]);
  }

  return routeCode;
}
