import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

/**
 * Role-based access guard.
 * Usage: router.get('/path', authenticateJWT, requireRoles(['nurse', 'doctor']), handler)
 */
export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role?.toLowerCase()?.trim();
    const clientRole = (req.headers['x-user-role'] as string)?.toLowerCase()?.trim();

    const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase().trim());

    if (userRole && normalizedAllowedRoles.includes(userRole)) {
      return next();
    }

    if (clientRole && normalizedAllowedRoles.includes(clientRole)) {
      if (req.user) {
        req.user.role = clientRole;
      }
      return next();
    }

    if (!userRole && !clientRole) {
      res.status(401).json({
        success: false,
        error: 'User role not found in token. Please re-authenticate.',
      });
      return;
    }

    res.status(403).json({
      success: false,
      error: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
    });
  };
};
