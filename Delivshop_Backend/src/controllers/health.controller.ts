import { Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database.js';
import { sendSuccess } from '../utils/response.js';

export const healthController = {
  async getHealth(_req: Request, res: Response): Promise<void> {
    const dbHealth = await checkDatabaseHealth();
    const status = dbHealth.healthy ? 'HEALTHY' : 'DEGRADED';
    const statusCode = dbHealth.healthy ? 200 : 503;

    res.status(statusCode).json({
      success: dbHealth.healthy,
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      components: {
        api: 'UP',
        database: dbHealth.healthy ? 'UP' : 'DOWN',
        latencyMs: dbHealth.latencyMs,
      },
    });
  },
};
