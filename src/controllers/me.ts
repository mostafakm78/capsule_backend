import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { AppError, AuthRequest } from '../types/types';
import { deleteImageBulletproof, toImagesRelative, IMAGES_ROOT, resolveImageAbsolutePath } from '../helper/fileCleanup';
import { removeUploaded } from '../helper/remover';
import Notification from '../models/Notification';
import { validationResult } from 'express-validator';

/* ------------ Types for bodies ------------ */

/**
 * Allowed fields for PATCH /me.
 * All optional; only provided ones will be updated.
 * If sending a file, use multipart/form-data (e.g., multer single('image')).
 */
type UpdateProfileBody = {
  name?: string;
  education?: string;
  birthday?: string;
  about?: string;

  // Password change fields (enter password branch if either is present)
  currentPassword?: string;
  newPassword?: string;

  // Optional toggle to remove avatar (multipart/form-data)
  removeImage?: 'true' | 'false';
};

type EmptyParams = Record<string, never>;

/* ------------ GET /me ------------ */
/** Get the current authenticated user profile */
export const getUser = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    if (!userId) {
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return next({ message: 'User not found', statusCode: 404 } as AppError);
    }

    return res.status(200).json({ message: 'User found', user });
  } catch (error: any) {
    return next({ message: 'Failed to get user', data: error?.message ?? error, statusCode: 500 } as AppError);
  }
};

/* ------------ PATCH /me ------------ */
/** Update user profile or password */
export const updateUser = async (req: Request<EmptyParams, unknown, UpdateProfileBody> & AuthRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({
      message: 'update user Validation Falied',
      statusCode: 422,
      data: errors.array().map((err) => err.msg),
    } as AppError);
  }
  try {
    const userId: string | undefined = req.user?.id;
    if (!userId) {
      await removeUploaded(req);
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    const body: UpdateProfileBody = req.body ?? {};
    const file: Express.Multer.File | undefined = (req as any).file;
    const wantsPasswordChange: boolean = typeof body.newPassword === 'string' || typeof body.currentPassword === 'string';

    // -------- Password branch --------
    if (wantsPasswordChange) {
      const currentPassword: string = String(body.currentPassword ?? '');
      const newPassword: string = String(body.newPassword ?? '');

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
        return next({ message: 'User not found', statusCode: 404 } as AppError);
      }

      const ok: boolean = await bcrypt.compare(currentPassword, userDoc.password);
      if (!ok) {
        await removeUploaded(req);
        return next({ message: 'Current password is incorrect', statusCode: 400 } as AppError);
      }

      const prevAvatar: string | undefined = userDoc.avatar as string | undefined;
      userDoc.password = await bcrypt.hash(newPassword, 12);

      if (body.name !== undefined) userDoc.name = String(body.name).trim();
      if (body.about !== undefined) userDoc.about = String(body.about).trim();
      if (body.birthday !== undefined) userDoc.birthday = body.birthday ? String(body.birthday) : undefined;
      if (body.education !== undefined) userDoc.education = String(body.education);

      if (body.removeImage === 'true') {
        userDoc.avatar = undefined as any;
      } else if (file?.path) {
        const normalized = file.path.replace(/\\/g, '/'); // normalize path for all OS
        userDoc.avatar = toImagesRelative(normalized); // store relative path
      }

      await userDoc.save();

      // Cleanup previous avatar if needed
      if (body.removeImage === 'true' && prevAvatar) {
        await deleteImageBulletproof(prevAvatar);
      } else if (file?.path && prevAvatar && prevAvatar !== userDoc.avatar) {
        await deleteImageBulletproof(prevAvatar);
      }

      const safe = userDoc.toObject();
      delete (safe as any).password;
      return res.status(200).json({ message: 'Password updated', user: safe });
    }

    // ---------- Profile-only branch ----------
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      await removeUploaded(req);
      return next({ message: 'User not found', statusCode: 404 } as AppError);
    }

    let touched: boolean = false;

    if (body.name !== undefined) {
      userDoc.name = String(body.name).trim(); // trim name
      touched = true;
    }
    if (body.about !== undefined) {
      userDoc.about = String(body.about).trim(); // trim about
      touched = true;
    }
    if (body.birthday !== undefined) {
      userDoc.birthday = body.birthday ? String(body.birthday) : undefined; // allow unset
      touched = true;
    }
    if (body.education !== undefined) {
      userDoc.education = String(body.education);
      touched = true;
    }

    if (body.removeImage === 'true') {
      userDoc.avatar = undefined as any; // remove avatar
      touched = true;
    } else if (file?.path) {
      const normalized = file.path.replace(/\\/g, '/'); // normalize path
      userDoc.avatar = toImagesRelative(normalized); // set new avatar
      touched = true;
    }

    if (!touched) {
      await removeUploaded(req); // file came in but no actual updates
      return res.status(200).json({ message: 'Nothing to update' });
    }

    await userDoc.save();

    // Cleanup previous avatar if it changed or was removed
    // (left intentionally minimal to keep logic unchanged)

    const safe = userDoc.toObject();
    delete (safe as any).password;
    return res.status(200).json({ message: 'Profile updated', user: safe });
  } catch (error: any) {
    await removeUploaded(req);

    if (error?.code === 11000 && error?.keyPattern?.email) {
      return next({ message: 'Email is already in use', statusCode: 409 } as AppError);
    }
    return next({
      message: 'Error updating user',
      statusCode: 500,
      data: error?.message ?? error,
    } as AppError);
  }
};

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const AllNotif = await Notification.find({}).sort({ createdAt: -1, _id: -1 }).lean();

    if (!AllNotif) return next({ message: 'Notifications not found', statusCode: 404 } as AppError);

    if (AllNotif.length === 0) {
      return res.status(200).json({ message: 'No notifications', notifications: [] });
    }

    res.status(200).json({ message: 'Notifications here', AllNotif });
  } catch (error: any) {
    return next({
      message: 'Internal error while getting notifications',
      statusCode: 500,
      data: error?.message ?? error,
    } as AppError);
  }
};
