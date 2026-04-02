import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from './error.middleware.js';

type UserRole = 'customer' | 'admin' | 'pharmacist';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: UserRole;
  };
}

export interface JwtPayload {
  id: number;
  email: string;
  role: UserRole;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    (req as AuthRequest).user = verifyToken(authHeader.slice(7));
    next();
  } catch (error) {
    next(error);
  }
}

export const requireAuth = authenticate;

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      (req as AuthRequest).user = verifyToken(authHeader.slice(7));
    }
    next();
  } catch {
    next();
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const authReq = req as AuthRequest;

      if (!authReq.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!allowedRoles.includes(authReq.user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(...allowedRoles: UserRole[]) {
  return authorize(...allowedRoles);
}

export const requireAdmin = authorize('admin');
export const requirePharmacist = authorize('pharmacist', 'admin');

export function requireOwnership(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const rawUserId = asString(req.params.userId);
    const userId = rawUserId ? Number.parseInt(rawUserId, 10) : null;

    if (authReq.user.role === 'admin' || userId === null || authReq.user.id === userId) {
      next();
      return;
    }

    throw new ForbiddenError('You can only access your own data');
  } catch (error) {
    next(error);
  }
}
