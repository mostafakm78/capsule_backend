import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { cookieOpts } from '../helper/cookie';

import type { AppError, AuthRequest, IUser } from '../types/types';

/* ───────────────────── Types ───────────────────── */

// Allowed roles for auth
type Role = 'admin' | 'user';

// Access-token JWT payload
interface AccessPayload extends jwt.JwtPayload {
  id: string;
  role: Role;
}

// Refresh-token JWT payload
interface RefreshPayload extends jwt.JwtPayload {
  id: string;
}

// Cookies parsed by cookie-parser
type AuthCookies = {
  accessToken?: string;
  refreshToken?: string;
};

// Express Request augmented with auth + cookies
type AuthedRequest = Request & AuthRequest & { cookies?: AuthCookies };

/* ───────────────────── Utils ───────────────────── */

// Hash refresh token (SHA-256) for DB storage
const hashRt = (rt: string): string => crypto.createHash('sha256').update(rt).digest('hex');

/* ─────────────────── Middlewares ─────────────────── */

/** Auth guard: verify access token, fallback to refresh rotation */
export const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const access: string | undefined = req.cookies?.accessToken;
  const refresh: string | undefined = req.cookies?.refreshToken;

  const JWT_SECRET: string | undefined = process.env.JWT_SECRET;
  const JWT_REFRESH_SECRET: string | undefined = process.env.JWT_REFRESH_SECRET;

  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    return next({ message: 'Server JWT misconfigured', statusCode: 500 } as AppError);
  }

  try {
    // Prefer access token
    if (!access) throw new Error('No access');

    const payload: AccessPayload = jwt.verify(access, JWT_SECRET) as AccessPayload;
    if (!payload?.id || (payload.role !== 'admin' && payload.role !== 'user')) {
      throw new Error('Bad access payload');
    }

    // Minimal user lookup to enforce ban in real-time
    const user = await User.findById(payload.id).select('role isBanned');
    if (!user) return next({ message: 'User not found', statusCode: 404 } as AppError);
    if (user.isBanned) return next({ message: 'User is banned', statusCode: 403 } as AppError);

    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (_e) {
    // Fallback to refresh flow
    if (!refresh) {
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    try {
      const rPayload: RefreshPayload = jwt.verify(refresh, JWT_REFRESH_SECRET) as RefreshPayload;
      if (!rPayload?.id) {
        return next({ message: 'Authentication required', statusCode: 401 } as AppError);
      }

      // Load user incl. stored hashed refreshToken
      const user = (await User.findById(rPayload.id).select('+refreshToken')) as (IUser & { save: () => Promise<IUser> }) | null;

      if (!user || !user.refreshToken || user.refreshToken !== hashRt(refresh)) {
        return next({ message: 'Invalid refresh token', statusCode: 403 } as AppError);
      }

      // Rotate tokens (issue new pair)
      const newAccess: string = jwt.sign({ id: String(user._id), role: user.role as Role }, JWT_SECRET, { expiresIn: '15m' });

      const newRefresh: string = jwt.sign({ id: String(user._id) }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

      user.refreshToken = hashRt(newRefresh);
      await user.save();

      // Set cookies (httpOnly etc. via cookieOpts)
      res.cookie('accessToken', newAccess, cookieOpts(15 * 60 * 1000));
      res.cookie('refreshToken', newRefresh, cookieOpts(7 * 24 * 60 * 60 * 1000));

      req.user = { id: String(user._id), role: user.role as Role };
      return next();
    } catch (_e2) {
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }
  }
};

/** Role guard: admin only */
export const requireAdmin = async (req: Request & AuthRequest, _res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return next({ message: 'Admin only', statusCode: 403 } as AppError);
  }
  return next();
};

/** Ban guard: block banned users (lightweight DB check) */
export const userIsBanned = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;

    if (!userId) {
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    const user: IUser | null = await User.findById(userId);

    if (!user) {
      return next({ message: 'User not found', statusCode: 404 } as AppError);
    }

    if (user.isBanned) {
      return next({ message: 'User is banned', statusCode: 403 } as AppError);
    } else {
      next();
    }
  } catch (error: any) {
    return next({
      message: 'Error in ban middleware',
      statusCode: 500,
      data: error?.message || error,
    } as AppError);
  }
};
