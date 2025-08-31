import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { cookieOpts } from '../helper/cookie';

import type { AppError, AuthRequest, IUser } from '../types/types';

/* ───────────────────── Types ───────────────────── */

type Role = 'admin' | 'user';

/** JWT payload for access token */
interface AccessPayload extends jwt.JwtPayload {
  id: string;
  role: Role;
}

/** JWT payload for refresh token */
interface RefreshPayload extends jwt.JwtPayload {
  id: string;
}

/** Cookies shape we expect after cookie-parser */
type AuthCookies = {
  accessToken?: string;
  refreshToken?: string;
};

/** Request augmented with AuthRequest and cookies */
type AuthedRequest = Request & AuthRequest & { cookies?: AuthCookies };

/* ───────────────────── Utils ───────────────────── */

/** Hash refresh token with SHA-256 for DB storage */
const hashRt = (rt: string): string => crypto.createHash('sha256').update(rt).digest('hex');

/* ─────────────────── Middlewares ─────────────────── */

/** Ensure user is authenticated (access/refresh flow) */
export const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const access: string | undefined = req.cookies?.accessToken;
  const refresh: string | undefined = req.cookies?.refreshToken;

  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    return next({ message: 'Server JWT misconfigured', statusCode: 500 } as AppError);
  }

  try {
    // Try access token first
    if (!access) throw new Error('No access');

    const payload = jwt.verify(access, JWT_SECRET) as AccessPayload;
    if (!payload?.id || (payload.role !== 'admin' && payload.role !== 'user')) {
      throw new Error('Bad access payload');
    }

    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (_e) {
    // Fallback to refresh token
    if (!refresh) {
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    try {
      const rPayload = jwt.verify(refresh, JWT_REFRESH_SECRET) as RefreshPayload;
      if (!rPayload?.id) {
        return next({ message: 'Authentication required', statusCode: 401 } as AppError);
      }

      // Load user with refreshToken selected
      const user = (await User.findById(rPayload.id).select('+refreshToken')) as
        | (IUser & {
            save: () => Promise<IUser>;
          })
        | null;

      if (!user || !user.refreshToken || user.refreshToken !== hashRt(refresh)) {
        return next({ message: 'Invalid refresh token', statusCode: 403 } as AppError);
      }

      // Rotate tokens
      const newAccess = jwt.sign({ id: String(user._id), role: user.role as Role }, JWT_SECRET, { expiresIn: '15m' });

      const newRefresh = jwt.sign({ id: String(user._id) }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

      user.refreshToken = hashRt(newRefresh);
      await user.save();

      // Set cookies (HttpOnly etc. assumed in cookieOpts)
      res.cookie('accessToken', newAccess, cookieOpts(15 * 60 * 1000));
      res.cookie('refreshToken', newRefresh, cookieOpts(7 * 24 * 60 * 60 * 1000));

      req.user = { id: String(user._id), role: user.role as Role };
      return next();
    } catch (_e2) {
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }
  }
};

/** Ensure user is admin */
export const requireAdmin = (req: Request & AuthRequest, _res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return next({ message: 'Admin only', statusCode: 403 } as AppError);
  }
  return next();
};
