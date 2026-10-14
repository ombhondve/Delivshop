import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  details?: Record<string, string[]>
) {
  return res.status(statusCode).json({
    success: false,
    message,
    details,
  });
}
