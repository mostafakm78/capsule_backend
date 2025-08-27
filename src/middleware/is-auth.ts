import { Response, Request, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AppError, AuthRequest } from '../types/todo';
import User from '../models/User';

type JwtPayload = { id: string; role: 'admin' | 'user'; iat: number; exp: number };

export const requireAuth = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken as string | undefined;
    if (!token) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next({
        message: 'Server JWT misconfigured',
        statusCode: 500,
      } as AppError);
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, secret) as JwtPayload;
      req.user = { id: payload.id, role: payload.role };
      next();
    } catch (error) {
      return next({
        message: 'Access token expired or invalid',
        statusCode: 401,
      } as AppError);
    }
  } catch (error) {
    return next({
      message: 'Auth middleware failed',
      statusCode: 500,
      data: error,
    } as AppError);
  }
};

export const requireAdmin = (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return next({
      message: 'Admin only',
      statusCode: 403,
    } as AppError);
  }
  return next();
};
