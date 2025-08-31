import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

import User from '../models/User';
import { AppError, AuthRequest } from '../types/types';
import { deleteImageBulletproof, toImagesRelative, IMAGES_ROOT, resolveImageAbsolutePath } from '../helper/fileCleanup';
import { removeUploaded } from '../helper/remover';

/* ------------ Types for bodies ------------ */

/**
 * Allowed/expected fields in the PATCH /me request body.
 * All fields are optional; controller will update only provided ones.
 * When sending a file, the request should be multipart/form-data and the file
 * should be available at `req.file` (e.g., via multer single('image')).
 */
type UpdateProfileBody = {
  name?: string;
  education?: string;
  birthday?: string;
  about?: string;

  // Password change flow (if either of these is present, we enter the password branch)
  currentPassword?: string;
  newPassword?: string;

  // Optional toggle for avatar removal when using multipart/form-data
  // Send 'true' to remove existing avatar, 'false' or omit to keep it.
  removeImage?: 'true' | 'false';
};

type EmptyParams = Record<string, never>;

/* ------------ GET /me ------------ */
/** Get current authenticated user profile */
export const getUser = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return next({ message: 'User not Found', statusCode: 404 } as AppError);
    }

    return res.status(200).json({ message: 'user Found', user });
  } catch (error: any) {
    return next({ message: 'cant find user!', data: error, statusCode: 500 } as AppError);
  }
};

/* ------------ PATCH /me ------------ */
/** Update user profile or password */
export const updateUser = async (req: Request<EmptyParams, unknown, UpdateProfileBody> & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      await removeUploaded(req);
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    const body = req.body ?? {};
    const file = (req as any).file as Express.Multer.File | undefined;
    const wantsPasswordChange = typeof body.newPassword === 'string' || typeof body.currentPassword === 'string';

    // -------- Password branch --------
    if (wantsPasswordChange) {
      const currentPassword = String(body.currentPassword ?? '');
      const newPassword = String(body.newPassword ?? '');

      if (!currentPassword || !newPassword) {
        await removeUploaded(req);
        return next({
          message: 'currentPassword and newPassword are required',
          statusCode: 400,
        } as AppError);
      }
      if (newPassword.length < 8) {
        await removeUploaded(req);
        return next({
          message: 'newPassword must be at least 8 characters',
          statusCode: 400,
        } as AppError);
      }

      const userDoc = await User.findById(userId).select('+password');
      if (!userDoc) {
        await removeUploaded(req);
        return next({ message: 'User not Found', statusCode: 404 } as AppError);
      }

      const ok = await bcrypt.compare(currentPassword, userDoc.password);
      if (!ok) {
        await removeUploaded(req);
        return next({ message: 'Current password is incorrect', statusCode: 400 } as AppError);
      }

      const prevAvatar = userDoc.avatar as string | undefined;
      userDoc.password = await bcrypt.hash(newPassword, 12);

      if (body.name !== undefined) userDoc.name = String(body.name).trim();
      if (body.about !== undefined) userDoc.about = String(body.about).trim();
      if (body.birthday !== undefined) userDoc.birthday = body.birthday ? String(body.birthday) : undefined;
      if (body.education !== undefined) userDoc.education = String(body.education);

      if (body.removeImage === 'true') {
        userDoc.avatar = undefined as any;
      } else if (file?.path) {
        const normalized = file.path.replace(/\\/g, '/');
        userDoc.avatar = toImagesRelative(normalized);
      }

      await userDoc.save();

      if (body.removeImage === 'true' && prevAvatar) {
        await deleteImageBulletproof(prevAvatar);
      } else if (file?.path && prevAvatar && prevAvatar !== userDoc.avatar) {
        await deleteImageBulletproof(prevAvatar);
      }

      const safe = userDoc.toObject();
      delete (safe as any).password;
      return res.status(200).json({ message: 'Password updated', user: safe });
    }

    // ---------- Profile only ----------
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      await removeUploaded(req);
      return next({ message: 'User not Found', statusCode: 404 } as AppError);
    }

    const prevAvatar = userDoc.avatar as string | undefined;
    let touched = false;

    if (body.name !== undefined) {
      userDoc.name = String(body.name).trim();
      touched = true;
    }
    if (body.about !== undefined) {
      userDoc.about = String(body.about).trim();
      touched = true;
    }
    if (body.birthday !== undefined) {
      userDoc.birthday = body.birthday ? String(body.birthday) : undefined;
      touched = true;
    }
    if (body.education !== undefined) {
      userDoc.education = String(body.education);
      touched = true;
    }

    if (body.removeImage === 'true') {
      userDoc.avatar = undefined as any;
      touched = true;
    } else if (file?.path) {
      const normalized = file.path.replace(/\\/g, '/');
      userDoc.avatar = toImagesRelative(normalized);
      touched = true;
    }

    if (!touched) {
      await removeUploaded(req); // فایل اومده ولی هیچ آپدیتی نشد
      return res.status(200).json({ message: 'nothing to update' });
    }

    await userDoc.save();

    // پاکسازی آواتار قبلی ...
    // ...

    const safe = userDoc.toObject();
    delete (safe as any).password;
    return res.status(200).json({ message: 'Profile Updated', user: safe });
  } catch (error: any) {
    await removeUploaded(req);

    if (error?.code === 11000 && error?.keyPattern?.email) {
      return next({ message: 'Email is already in use', statusCode: 409 } as AppError);
    }
    return next({
      message: 'error in update user',
      statusCode: 500,
      data: error?.message,
    } as AppError);
  }
};
