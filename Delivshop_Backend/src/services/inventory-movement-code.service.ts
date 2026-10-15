import { PoolClient } from 'pg';
import { dbPool } from '../config/database.js';

const MOVEMENT_PREFIX = 'MOV';

export const inventoryMovementCodeService = {
  /**
   * Generates a unique, concurrency-safe inventory movement identifier (e.g. MOV-1001).
   * If a client is provided, runs inside that client's transaction lock.
   */
  async generateNextMovementNumber(client?: PoolClient): Promise<string> {
    const queryRunner = client || dbPool;

    // Use row-level lock FOR UPDATE to guarantee monotonic increment under concurrency
    const res = await queryRunner.query<{ last_sequence: number }>(
      `UPDATE inventory_movement_counters
       SET last_sequence = last_sequence + 1,
           updated_at = NOW()
       WHERE counter_prefix = $1
       RETURNING last_sequence;`,
      [MOVEMENT_PREFIX]
    );

    if (res.rows.length === 0) {
      // Initialize counter if missing
      await queryRunner.query(
        `INSERT INTO inventory_movement_counters (counter_prefix, last_sequence)
         VALUES ($1, 1000)
         ON CONFLICT (counter_prefix) DO NOTHING;`,
        [MOVEMENT_PREFIX]
      );

      const retryRes = await queryRunner.query<{ last_sequence: number }>(
        `UPDATE inventory_movement_counters
         SET last_sequence = last_sequence + 1,
             updated_at = NOW()
         WHERE counter_prefix = $1
         RETURNING last_sequence;`,
        [MOVEMENT_PREFIX]
      );

      const seq = retryRes.rows[0]?.last_sequence || 1001;
      return `${MOVEMENT_PREFIX}-${seq}`;
    }

    const seq = res.rows[0].last_sequence;
    return `${MOVEMENT_PREFIX}-${seq}`;
  },
};
