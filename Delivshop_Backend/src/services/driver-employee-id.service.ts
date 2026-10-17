import crypto from 'crypto';
import pg from 'pg';
import { dbPool } from '../config/database.js';
import { AppError } from '../utils/errors.js';

const PREFIX = 'EMP';

/**
 * Cryptographically secure random generation of Driver Employee IDs
 * Format: EMP- followed by exactly 10 numeric digits (e.g. EMP-5831047296)
 * Enforces uniqueness against users table with bounded collision retries.
 */
export async function generateDriverEmployeeId(client?: pg.PoolClient): Promise<string> {
  const runner = client || dbPool;
  const maxAttempts = 12;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Generate exactly 10 cryptographically random numeric digits (0-9)
    let digits = '';
    for (let i = 0; i < 10; i++) {
      digits += crypto.randomInt(0, 10).toString();
    }

    const candidateId = `${PREFIX}-${digits}`;

    // Verify uniqueness against existing database users
    const exists = await runner.query('SELECT 1 FROM users WHERE employee_id = $1 LIMIT 1', [candidateId]);
    if (exists.rows.length === 0) {
      return candidateId;
    }
  }

  throw new AppError('Unable to generate unique Driver Employee ID after maximum collision attempts.', 500);
}
