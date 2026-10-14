import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens.js';
import { sendError } from '../utils/response.js';
import { AuthUser, UserRole } from '../types/user.types.js';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required: missing or invalid authorization header', 401);
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    sendError(res, 'Authentication required: empty token provided', 401);
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
      shopId: payload.shopId,
      driverId: payload.driverId,
    };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'Session expired: token has expired', 401);
      return;
    }
    sendError(res, 'Authentication failed: invalid token signature', 401);
  }
}
