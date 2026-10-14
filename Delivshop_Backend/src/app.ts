import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ALLOWED_ORIGIN_LIST, ENV } from './config/env.js';
import { generalRateLimiter } from './middleware/rateLimiter.middleware.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import apiRouter from './routes/index.js';

export const createApp = (): Application => {
  const app = express();

  // 1. Security Headers (interop safe across CJS/ESM and TypeScript 5.8/5.9+ NodeNext)
  const helmetMiddleware: any = (helmet as any)?.default || helmet;
  app.use(
    helmetMiddleware({
      contentSecurityPolicy: ENV.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. Strict CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGIN_LIST.includes(origin) || ENV.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error(`CORS origin '${origin}' is not allowed by policy`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 3. Body Parsing with Strict Size Limit (DoS protection)
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // 4. Rate Limiting
  app.use('/api', generalRateLimiter);

  // 5. Mount API Routes
  app.use('/api', apiRouter);

  // 6. 404 Route Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
    });
  });

  // 7. Centralized Error Handling
  app.use(errorHandler);

  return app;
};
