import pg from 'pg';
import { dbPool } from '../config/database.js';

export interface ShopIdResult {
  shopId: string;
  registrationDate: string; // YYYY-MM-DD
  sequenceNumber: number;
}

/**
 * Format date in the business's configured timezone (Asia/Kolkata UTC+05:30).
 * Returns { dateStr: 'YYYYMMDD', sqlDate: 'YYYY-MM-DD' }
 */
export function getBusinessDateParts(date: Date = new Date(), timeZone = 'Asia/Kolkata'): {
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

export class ShopIdLimitExceededError extends Error {
  constructor(dateStr: string) {
    super(`Daily limit of 999 shop registrations has been reached for date ${dateStr}. No more shops can be created today.`);
    this.name = 'ShopIdLimitExceededError';
  }
}

/**
 * Generate a concurrency-safe atomic Shop ID in the format YYYYMMDDNNN.
 * Must be executed within a transaction using the provided PoolClient.
 */
export async function generateShopId(
  client?: pg.PoolClient,
  customDate?: Date,
  timeZone = 'Asia/Kolkata'
): Promise<ShopIdResult> {
  const { dateKey, sqlDate } = getBusinessDateParts(customDate, timeZone);
  const runner = client || dbPool;

  // Concurrency-safe atomic counter query with upsert and row locking
  const queryText = `
    INSERT INTO shop_id_counters (counter_date, last_sequence, updated_at)
    VALUES ($1, 1, NOW())
    ON CONFLICT (counter_date) DO UPDATE 
    SET last_sequence = shop_id_counters.last_sequence + 1,
        updated_at = NOW()
    RETURNING last_sequence;
  `;

  const res = await runner.query(queryText, [sqlDate]);
  const sequenceNumber = Number(res.rows[0].last_sequence);

  if (sequenceNumber > 999) {
    throw new ShopIdLimitExceededError(sqlDate);
  }

  const paddedSequence = String(sequenceNumber).padStart(3, '0');
  const shopId = `${dateKey}${paddedSequence}`;

  return {
    shopId,
    registrationDate: sqlDate,
    sequenceNumber,
  };
}
