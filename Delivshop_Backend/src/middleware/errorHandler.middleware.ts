import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error internally with stack trace
  logger.error(`${req.method} ${req.url} - Error caught by central handler`, err);

  const statusCode = err.statusCode || err.status || 500;

  // Never leak database errors, stack traces, or internal server errors to clients
  const clientMessage =
    statusCode >= 500
      ? 'An unexpected internal server error occurred. Please try again later.'
      : err.message || 'Request processing failed.';

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(ENV.NODE_ENV === 'development' && {
      // Only include debug code or simplified name in dev, never stack or db queries
      errorType: err.name,
    }),
  });
}
