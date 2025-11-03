import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../service/authService';
import { AuthRequest } from '../types';
import { UserRole } from '@prisma/client';
import { JWT_CONSTANTS, ERROR_MESSAGES, HTTP_STATUS } from '../utils/constants';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.TOKEN_NOT_PROVIDED });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.INVALID_TOKEN });
    }

    if (!JWT_CONSTANTS.SECRET_KEY) {
      throw new Error('JWT_SECRET não configurado');
    }

    const decoded = jwt.verify(token, JWT_CONSTANTS.SECRET_KEY) as any;

    const user = await AuthService.findUserById(decoded.id);

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.USER_NOT_FOUND });
    }

    (req as AuthRequest).user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.INVALID_TOKEN });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.TOKEN_EXPIRED });
    }
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.INVALID_TOKEN });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.INVALID_TOKEN });
    }

    if (!roles.includes(user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ error: ERROR_MESSAGES.ACCESS_DENIED });
    }

    next();
  };
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && JWT_CONSTANTS.SECRET_KEY) {
      const token = authHeader.split(' ')[1];

      if (token) {
        const decoded = jwt.verify(token, JWT_CONSTANTS.SECRET_KEY) as any;

        (req as AuthRequest).user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
