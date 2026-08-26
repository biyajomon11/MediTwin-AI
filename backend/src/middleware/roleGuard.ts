import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

/**
 * Role-based access guard.
 * Usage: router.get('/path', authenticateJWT, requireRoles(['nurse', 'doctor']), handler)
 */
export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole) {
      res.status(401).json({
        success: false,
        error: 'User role not found in token. Please re-authenticate.',
      });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
      });
      return;
    }

    next();
  };
};
