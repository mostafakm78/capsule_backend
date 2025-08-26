import { Response, Request, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AppError, AuthRequest } from '../types/todo';
import User from '../models/User';

type JwtPayload = { id: string; role: 'admin' | 'user'; iat: number; exp: number };

export const requireAuth = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token as string | undefined;
    if (!token) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return {
        message: 'Server JWT misconfigured',
        statusCode: 500,
      } as AppError;
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, secret) as JwtPayload;
    } catch (error) {
      return {
        message: 'Invalid or expired token',
        statusCode: 401,
      } as AppError;
    }

    const user = await User.findById(payload.id).lean();
    if (!user) {
      return {
        message: 'User not Found',
        statusCode: 404,
      } as AppError;
    }

    if (user.isBanned) {
      return {
        message: 'User Is Banned',
        statusCode: 403,
      } as AppError;
    }

    req.user = { id: payload.id, role: payload.role, email: user.email };
    next();
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
  next();
};
