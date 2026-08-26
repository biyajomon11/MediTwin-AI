import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
    nurseId?: number;
  };
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.',
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const secret = process.env.JWT_SECRET || 'super-secret-meditwin-jwt-key';
    const decoded = jwt.verify(token, secret) as {
      userId: number;
      email: string;
      role: string;
      nurseId?: number;
    };

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(403).json({
        success: false,
        error: 'Session expired. Please sign in again.',
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid authentication token.',
      });
    }
  }
};
