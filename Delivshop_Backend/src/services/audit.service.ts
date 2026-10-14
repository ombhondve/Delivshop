import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

export const auditService = {
  async log(entry: {
    actorId?: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entry.actorId || null,
          entry.action,
          entry.entityType,
          entry.entityId,
          entry.details ? JSON.stringify(entry.details) : null,
          entry.ipAddress || null,
        ]
      );
    } catch (err) {
      // Never let audit logging failure fail main business action, but log error
      logger.error('Failed to persist audit log', err);
    }
  },
};
