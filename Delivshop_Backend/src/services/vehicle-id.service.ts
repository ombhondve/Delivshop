import crypto from 'crypto';
import pg from 'pg';
import { dbPool, query } from '../config/database.js';
import { AppError } from '../utils/errors.js';

const PREFIX = 'VEH';
// Unambiguous uppercase alphanumeric charset (excludes I, O, 0, 1 for visual clarity)
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Automatically generates a unique, meaningful Vehicle ID on the backend.
 * Format: VEH-YYYYMMDD-XXXX (e.g. VEH-20261017-A7K4)
 * Enforces uniqueness against the vehicles table with bounded collision retries.
 */
export async function generateVehicleId(client?: pg.PoolClient): Promise<string> {
  const runner = client || dbPool;
  const maxAttempts = 12;

  // Format YYYYMMDD in IST (Asia/Kolkata) or UTC date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateSegment = `${year}${month}${day}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += CHARSET[crypto.randomInt(0, CHARSET.length)];
    }

    const candidateId = `${PREFIX}-${dateSegment}-${suffix}`;

    // Verify uniqueness against vehicles table
    const exists = await runner.query('SELECT 1 FROM vehicles WHERE vehicle_code = $1 LIMIT 1', [candidateId]);
    if (exists.rows.length === 0) {
      return candidateId;
    }
  }

  throw new AppError('Unable to generate unique Vehicle ID after maximum collision attempts.', 500);
}
