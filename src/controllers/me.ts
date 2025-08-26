import { NextFunction, Request, Response } from 'express';
import { AppError, AuthRequest } from '../types/todo';
import User from '../models/User';
import bcrypt from 'bcryptjs';

export const getUser = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return next({
        message: 'User not Found',
        statusCode: 404,
      } as AppError);
    }

    res.status(200).json({ message: 'user Found', user });
  } catch (error) {
    next({
      message: 'cant find user!',
      data: error,
      statusCode: 500,
    } as AppError);
  }
};

export const updateUser = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    const allowed = ['name', 'email', 'education', 'birthday', 'avatar', 'about'] as const;

    const body = req.body as Record<string, unknown>;
    const hashPasswordChange = typeof body.password === 'string' || typeof body.newPassword === 'string';

    if (hashPasswordChange) {
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || body.password || '');

      if (!currentPassword || !newPassword) {
        return next({ message: 'currentPassword and newPassword are required', statusCode: 400 } as AppError);
      }

      const user = await User.findById(userId).select('+passowrd');
      if (!user) {
        return next({ message: 'User not Found', statusCode: 404 } as AppError);
      }

      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) {
        return next({ message: 'Current password is incorrect', statusCode: 400 } as AppError);
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      user.password = newPasswordHash;

      for (const key of allowed) {
        const val = body[key];
        if (val !== undefined) {
          if (key === 'name' || key === 'about') user[key] = String(val).trim();
          else if (key === 'birthday') user[key] = val ? String(val) : undefined;
          else user[key] = val as any;
        }
      }

      await user.save();

      const safe = user.toObject();
      delete (safe as any).passowrd;

      return res.status(200).json({
        message: 'Password updated',
        user: safe,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return next({
        message: 'User not Found',
        statusCode: 404,
      } as AppError);
    }

    let touched = false;
    for (const key of allowed) {
      const val = body[key];
      if (val !== undefined) {
        touched = true;
        if (key === 'name' || key === 'about') user[key] = String(val).trim();
        else if (key === 'birthday') user[key] = val ? String(val) : undefined;
        else user[key] = val as any;
      }
    }

    if (!touched) {
      return res.status(200).json({ message: 'nothing to update' });
    }

    await user.save();

    const safe = user.toObject();
    delete (safe as any).passowrd;

    return res.status(200).json({
      message: 'Profile Updated',
      user: safe,
    });
  } catch (error: any) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return next({ message: 'Email is already in use', statusCode: 409 } as AppError);
    }
    return next({
      message: 'error in update user',
      statusCode: 500,
      data: error.message,
    });
  }
};
