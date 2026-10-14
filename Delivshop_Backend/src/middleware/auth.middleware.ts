import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens.js';
import { sendError } from '../utils/response.js';
import { AuthUser, UserRole } from '../types/user.types.js';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // 1. Check Bearer Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Check HttpOnly session cookie
  if (!token && (req as any).cookies?.delivshop_session_token) {
    token = (req as any).cookies.delivshop_session_token;
  }

  if (!token) {
    sendError(res, 'Authentication required: missing or invalid authorization credentials', 401);
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
