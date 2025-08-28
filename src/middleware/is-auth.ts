import { Response, Request, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AppError, AuthRequest } from '../types/todo';
import User from '../models/User';
import crypto from 'crypto';
import { cookieOpts } from '../helper/cookie';

type JwtPayload = { id: string; role: 'admin' | 'user'; iat: number; exp: number };

const hashRt = (rt: string) => crypto.createHash('sha256').update(rt).digest('hex');

export const requireAuth = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  const access = req.cookies?.accessToken as string | undefined;
  const refresh = req.cookies?.refreshToken as string | undefined;

  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    return next({ message: 'Server JWT misconfigured', statusCode: 500 } as AppError);
  }

  try {
    if (!access) throw new Error('No access');

    const payload = jwt.verify(access, JWT_SECRET) as JwtPayload;
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch {
    if (!refresh) {
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    try {
      const rPayload = jwt.verify(refresh, JWT_REFRESH_SECRET) as { id: string; iat: number; exp: number };
      const user = await User.findById(rPayload.id).select('+refreshToken');
      if (!user || !user.refreshToken || user.refreshToken !== hashRt(refresh)) {
        return next({ message: 'Invalid refresh token', statusCode: 403 } as AppError);
      }
      const newAccess = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });

      const newRefresh = jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

      user.refreshToken = hashRt(newRefresh);
      await user.save();

      res.cookie('accessToken', newAccess, cookieOpts(15 * 60 * 1000));

      res.cookie('refreshToken', newRefresh, cookieOpts(7 * 24 * 60 * 60 * 1000));

      req.user = { id: user._id.toString(), role: user.role };
      return next();
    } catch {
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }
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
