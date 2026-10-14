import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { checkDatabaseHealth, dbPool } from './config/database.js';
import { logger } from './utils/logger.js';

const app = createApp();

// Only start HTTP listener if not running in a serverless environment (e.g. Vercel) and not testing
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  const server = app.listen(ENV.PORT, async () => {
    logger.info(`🚀 Delivshop API Server active on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
    logger.info(`🔒 Security headers (Helmet) & CORS restrictions initialized`);

    // Check database connectivity
    const dbHealth = await checkDatabaseHealth();
    if (dbHealth.healthy) {
      logger.info(`✅ PostgreSQL Database connected successfully (${dbHealth.latencyMs}ms)`);
      if (!dbHealth.schemaInitialized) {
        logger.warn(`⚠️ PostgreSQL connected, but table "users" was not found.`);
        logger.warn(`   Run database migrations to initialize schema: "npm run migrate"`);
      }
    } else {
      logger.warn(`⚠️ PostgreSQL connection not yet established: ${dbHealth.error}`);
      logger.warn(`   Ensure DATABASE_URL is configured and database server is running.`);
    }
  });

  // Graceful Shutdown Handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await dbPool.end();
      logger.info('Database pool closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;

