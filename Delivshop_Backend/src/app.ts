import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ALLOWED_ORIGIN_LIST, ENV, ENV_CONFIG_ERRORS } from './config/env.js';
import { generalRateLimiter } from './middleware/rateLimiter.middleware.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import apiRouter from './routes/index.js';

export const createApp = (): Application => {
  const app = express();

  // Trust first proxy hop (e.g. Vercel edge/gateway) for accurate client IP in rate limiting
  app.set('trust proxy', 1);

  // 1. Security Headers (interop safe across CJS/ESM and TypeScript 5.8/5.9+ NodeNext)
  const helmetMiddleware: any = (helmet as any)?.default || helmet;
  app.use(
    helmetMiddleware({
      contentSecurityPolicy: ENV.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. Comprehensive & Safe CORS Configuration
  const isAllowedOrigin = (origin: string): boolean => {
    const normalizedOrigin = origin.trim().replace(/\/+$/, '');

    // 1. Exact match in configured ALLOWED_ORIGIN_LIST or wildcard
    if (ALLOWED_ORIGIN_LIST.includes('*') || ALLOWED_ORIGIN_LIST.includes(normalizedOrigin)) {
      return true;
    }

    // 2. Explicitly allow production frontend origin
    if (normalizedOrigin === 'https://delivshop.vercel.app') {
      return true;
    }

    // 3. Domain & subdomain pattern matching
    try {
      const parsedUrl = new URL(normalizedOrigin);
      const hostname = parsedUrl.hostname;

      // Allow local development origins (web / mobile emulator)
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return true;
      }

      // Allow specific Delivshop Vercel deployments (production or delivshop pull-request previews)
      if (
        hostname === 'delivshop.vercel.app' ||
        (hostname.startsWith('delivshop-') && hostname.endsWith('.vercel.app'))
      ) {
        return true;
      }

      // Wildcard prefix matching, e.g. *.delivshop.com
      for (const allowed of ALLOWED_ORIGIN_LIST) {
        if (allowed.startsWith('*.')) {
          const rootDomain = allowed.slice(2);
          if (hostname === rootDomain || hostname.endsWith(`.${rootDomain}`)) {
            return true;
          }
        }
      }
    } catch {
      return false;
    }

    return false;
  };

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, native curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      // Origin not permitted: notify CORS without throwing a 500 error
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // 3. Body & Cookie Parsing with Strict Size Limit (DoS protection)
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());

  // Root health endpoint for deployment probes
  app.get('/', (_req: Request, res: Response) => {
    if (ENV_CONFIG_ERRORS.length > 0) {
      res.status(200).json({
        status: 'CONFIGURATION_REQUIRED',
        service: 'Delivshop Backend API',
        message: 'Backend server is running, but required production environment variables are not yet configured in Vercel.',
        missingVariables: ENV_CONFIG_ERRORS.map((e) => e.key),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      status: 'UP',
      service: 'Delivshop Backend API',
      timestamp: new Date().toISOString(),
    });
  });

  // 4. Rate Limiting
  app.use('/api', generalRateLimiter);
  app.use(generalRateLimiter);

  // 5. Incomplete Environment Configuration Guard (prevents silent 500 FUNCTION_INVOCATION_FAILED and provides clear feedback)
  if (ENV_CONFIG_ERRORS.length > 0) {
    const configErrorHandler = (_req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        message: `Backend service configuration incomplete: Missing environment variables on Vercel (${ENV_CONFIG_ERRORS.map((e) => e.key).join(', ')}).`,
        missingVariables: ENV_CONFIG_ERRORS.map((e) => e.key),
        actionRequired: 'Please configure these environment variables in your Vercel Project Settings under Settings -> Environment Variables, then redeploy.',
      });
    };

    app.use('/auth', configErrorHandler);
    app.use('/api/auth', configErrorHandler);
    app.use('/companies', configErrorHandler);
    app.use('/api/companies', configErrorHandler);
    app.use('/shops', configErrorHandler);
    app.use('/api/shops', configErrorHandler);
    app.use('/orders', configErrorHandler);
    app.use('/api/orders', configErrorHandler);
  }

  // 6. Mount API Routes (mount at /api and root to seamlessly handle both /api/shops and /shops)
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

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
