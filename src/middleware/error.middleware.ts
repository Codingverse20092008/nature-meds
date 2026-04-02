import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class HttpError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Not Found') {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string = 'Conflict') {
    super(409, message);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string = 'Internal Server Error') {
    super(500, message);
  }
}

/**
 * Helper to detect database / libsql errors
 */
function isDatabaseError(err: Error): boolean {
  const msg = err.message || '';
  const name = err.name || '';
  return (
    msg.includes('SQLITE') ||
    msg.includes('database') ||
    msg.includes('no such column') ||
    msg.includes('no such table') ||
    msg.includes('NOT NULL constraint') ||
    msg.includes('UNIQUE constraint') ||
    msg.includes('FOREIGN KEY constraint') ||
    name === 'LibsqlError' ||
    name === 'ResponseError'
  );
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: AppError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Always log full error details server-side
  console.error('[Error Handler]', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle known operational errors (HttpError, BadRequestError, etc.)
  if ('statusCode' in err && 'isOperational' in err) {
    const httpErr = err as AppError;
    res.status(httpErr.statusCode || 500).json({
      success: false,
      message: httpErr.message,
      ...(env.NODE_ENV === 'development' && { stack: httpErr.stack }),
    });
    return;
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: (err as any).errors?.map((e: any) => ({
        field: e.path?.join('.') || 'unknown',
        message: e.message,
      })),
    });
    return;
  }

  // Handle database / libsql errors
  if (isDatabaseError(err)) {
    res.status(500).json({
      success: false,
      message: 'Database error occurred',
      ...(env.NODE_ENV === 'development' && {
        error: err.message,
        stack: err.stack,
      }),
    });
    return;
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    });
    return;
  }

  // Default: internal server error
  res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
