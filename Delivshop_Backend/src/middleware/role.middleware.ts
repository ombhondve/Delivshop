import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/user.types.js';
import { sendError } from '../utils/response.js';

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required before authorization check', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource`,
        403
      );
      return;
    }

    next();
  };
}
