import { NextFunction, Request, Response } from 'express';
import Capsule from '../models/Capsule';

import { FilterQuery, Types } from 'mongoose';
import { deleteImageBulletproof, toImagesRelative } from '../helper/fileCleanup';
import { AppError, AuthRequest } from '../types/types';
import { removeUploaded } from '../helper/remover';

/* ------------ GET /capsules ------------ */
export const getCapsules = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    const { page = '1', limit = '10', visibility, lock, unlockOnly, categoryItem, q, sort } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const now = new Date();

    const and: FilterQuery<typeof Capsule>[] = [{ owner: new Types.ObjectId(userId) }];

    if (visibility === 'public' || visibility === 'private') {
      and.push({ 'access.visibility': visibility });
    }
    if (lock === 'none' || lock === 'timed') {
      and.push({ 'access.lock': lock });
    }
    if (unlockOnly === 'true') {
      and.push({
        $or: [{ 'access.lock': 'none' }, { $and: [{ 'access.lock': 'timed' }, { 'access.unlockAt': { $lte: now } }] }],
      });
    }

    if (categoryItem) {
      const ids = String(categoryItem)
        .split(',')
        .map((s) => s.trim())
        .filter(Types.ObjectId.isValid)
        .map((id) => new Types.ObjectId(id));
      if (ids.length === 0) return res.status(400).json({ message: 'Invalid categoryItem id(s)' });

      and.push({ categoryItem: { $in: ids } });
    }

    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = (q ?? '').trim();
    if (query) {
      const pattern = escapeRegExp(query);
      and.push({ $or: [{ title: { $regex: pattern, $options: 'i' } }, { description: { $regex: pattern, $options: 'i' } }] });
    }

    const where: FilterQuery<typeof Capsule> = and.length === 1 ? and[0] : { $and: and };

    const s = (sort || '').toLowerCase();
    const dir: 1 | -1 = s === 'oldest' ? 1 : -1;
    const sortObj = { createdAt: dir as 1 | -1 };

    const [items, total] = await Promise.all([
      Capsule.find(where)
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Capsule.countDocuments(where),
    ]);

    return res.status(200).json({
      items,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      sort: dir === -1 ? 'newest' : 'oldest',
      filters: where,
    });
  } catch (error: any) {
    return next({ message: 'Failed to get capsules', statusCode: 500, data: error?.message } as AppError);
  }
};

/* ------------ POST /capsules ------------ */
export const createCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  // helper: delete uploaded file if any
  const removeUploaded = async () => {
    try {
      if (req.file?.path) {
        const normalized = req.file.path.replace(/\\/g, '/');
        await deleteImageBulletproof(toImagesRelative(normalized));
      }
    } catch {}
  };

  try {
    const userId = req.user?.id;
    const { title, description } = req.body;
    let { access, categoryItem } = req.body as any;

    if (!userId) {
      await removeUploaded();
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    if (!title || !description || !access || !categoryItem) {
      await removeUploaded();
      return next({ message: 'title , description , category and access required!', statusCode: 400 } as AppError);
    }

    if (!Types.ObjectId.isValid(categoryItem)) {
      await removeUploaded();
      return next({ message: 'Invalid categoryItem id', statusCode: 400 } as AppError);
    }

    // If multipart sent access as stringified JSON, parse it
    if (typeof access === 'string') {
      try {
        access = JSON.parse(access);
      } catch {
        // اگر JSON نامعتبر بود:
        await removeUploaded();
        return next({ message: 'Invalid access JSON', statusCode: 400 } as AppError);
      }
    }

    const allowedVisibility = ['public', 'private'] as const;
    const allowedLock = ['none', 'timed'] as const;

    const normalizedAccess: any = {
      ...(access?.visibility !== undefined ? { visibility: access.visibility } : {}),
      ...(access?.lock !== undefined ? { lock: access.lock } : {}),
      ...(access?.unlockAt !== undefined ? { unlockAt: access.unlockAt } : {}),
    };

    if (normalizedAccess.visibility && !allowedVisibility.includes(normalizedAccess.visibility)) {
      await removeUploaded();
      return next({ message: 'Invalid access.visibility', statusCode: 400 } as AppError);
    }
    if (normalizedAccess.lock && !allowedLock.includes(normalizedAccess.lock)) {
      await removeUploaded();
      return next({ message: 'Invalid access.lock', statusCode: 400 } as AppError);
    }

    // visibility=public -> lock none و بدون unlockAt
    if (normalizedAccess.visibility === 'public') {
      normalizedAccess.lock = 'none';
      delete normalizedAccess.unlockAt;
    }

    // اگر timed است باید private و unlockAt داشته باشد (و در آینده باشد)
    if (normalizedAccess.lock === 'timed') {
      if (normalizedAccess.visibility !== 'private') {
        await removeUploaded();
        return next({ message: 'timed lock is only allowed with private visibility', statusCode: 400 } as AppError);
      }
      if (!normalizedAccess.unlockAt) {
        await removeUploaded();
        return next({ message: 'unlockAt is required when lock is timed', statusCode: 400 } as AppError);
      }
      const unlockDate = new Date(normalizedAccess.unlockAt);
      if (isNaN(unlockDate.getTime()) || unlockDate.getTime() <= Date.now()) {
        await removeUploaded();
        return next({ message: 'unlockAt must be a valid future date', statusCode: 400 } as AppError);
      }
      normalizedAccess.unlockAt = unlockDate;
    }

    const doc: any = {
      title,
      description,
      categoryItem: new Types.ObjectId(categoryItem),
      owner: new Types.ObjectId(userId),
      ...(Object.keys(normalizedAccess).length && { access: normalizedAccess }),
      ...(req.body.color !== undefined && { color: req.body.color }),
      ...(req.body.extra !== undefined && { extra: req.body.extra }),
    };

    // ⬇️ store image relative path if uploaded
    if (req.file?.path) {
      const normalized = req.file.path.replace(/\\/g, '/');
      doc.image = toImagesRelative(normalized);
    }

    const newCapsule = await Capsule.create(doc);
    return res.status(201).json({ message: 'Capsule Created Successfully', newCapsule });
  } catch (error: any) {
    // در هر خطای غیرمنتظره/ولیدیشن مونگوس، فایل را پاک کن
    try {
      if (error?.name === 'ValidationError' || error) {
        await (async () => {
          if (req.file?.path) {
            const normalized = req.file.path.replace(/\\/g, '/');
            await deleteImageBulletproof(toImagesRelative(normalized));
            // یا: await fs.unlink(normalized).catch(() => {});
          }
        })();
      }
    } catch {}
    return next({ message: 'Created Capsule Failed', statusCode: 500, data: error?.message } as AppError);
  }
};

/* ------------ GET /capsules/:id ------------ */
export const getSingleCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const capsuleId = req.params.id;
    const userId = req.user?.id;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (!Types.ObjectId.isValid(capsuleId)) {
      return next({ message: 'Invalid capsule id', statusCode: 400 } as AppError);
    }

    const capsule = await Capsule.findOne({ _id: capsuleId, owner: userId }).lean();
    if (!capsule) {
      return next({ message: 'Capsule not Found', statusCode: 404 } as AppError);
    }

    return res.status(200).json({ message: 'Capsule Found!', capsule });
  } catch (error: any) {
    return next({ message: 'error in find single capsule', statusCode: 500, data: error?.message } as AppError);
  }
};

/* ------------ DELETE /capsules/:id ------------ */
export const deleteCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const capsuleId = req.params.id;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (!Types.ObjectId.isValid(capsuleId)) {
      return next({ message: 'Invalid capsule id', statusCode: 400 } as AppError);
    }

    // Find first to get image path, then delete
    const existing = await Capsule.findOne({ _id: capsuleId, owner: userId }).select('image').lean();
    if (!existing) {
      return next({ message: 'Capsule not Found', statusCode: 404 } as AppError);
    }

    await Capsule.deleteOne({ _id: capsuleId, owner: userId });

    // ⬇️ delete image file after DB delete
    if (existing.image) {
      await deleteImageBulletproof(existing.image as string);
    }

    return res.status(200).json({ message: 'Capsule Deleted!' });
  } catch (error: any) {
    return next({ message: 'error in delete single capsule', statusCode: 500, data: error?.message });
  }
};

/* ------------ PATCH /capsules/:id ------------ */
export const editCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const capsuleId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      await removeUploaded(req);
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }
    if (!Types.ObjectId.isValid(capsuleId)) {
      await removeUploaded(req);
      return next({ message: 'Invalid capsule id', statusCode: 400 } as AppError);
    }

    // If access came as JSON string (multipart), parse it
    if (typeof (req.body as any).access === 'string') {
      try {
        (req.body as any).access = JSON.parse((req.body as any).access);
      } catch {}
    }

    // fetch existing to know previous image path
    const existing = await Capsule.findOne({ _id: capsuleId, owner: userId }).select('image access').lean();
    if (!existing) {
      await removeUploaded(req);
      return next({ message: 'Capsule not Found', statusCode: 404 } as AppError);
    }
    const prevImage = existing.image as string | undefined;

    const isTimedLocked = existing.access?.visibility === 'private' && existing.access?.lock === 'timed' && existing.access?.unlockAt && new Date(existing.access.unlockAt).getTime() > Date.now();

    const allowed = ['title', 'description', 'extra', 'color', 'categoryItem'] as const;
    const updates: Record<string, any> = {};
    let touched = false;

    for (const key of allowed) {
      const val = (req.body as any)[key];
      if (val !== undefined) {
        updates[key] = key === 'categoryItem' && Types.ObjectId.isValid(val) ? new Types.ObjectId(val) : val;
        touched = true;
      }
    }

    // upload new image
    if (req.file?.path) {
      const normalized = req.file.path.replace(/\\/g, '/');
      updates.image = toImagesRelative(normalized);
      touched = true;
    }

    // remove image request
    const removeImageRequested = (req.body as any).image === '' || (req.body as any).removeImage === 'true';
    if (removeImageRequested) {
      updates.image = undefined; // will translate to $unset
      touched = true;
    }

    // access object updates
    const access = (req.body as any).access;

    if (access && typeof access === 'object') {
      // اگر در حال حاضر قفل زمانی فعاله، هر تغییری روی access ممنوع
      if (isTimedLocked) {
        return next({
          message: 'Access is locked (timed). You cannot change access until unlockAt.',
          statusCode: 400,
        } as AppError);
      }

      if (access.visibility !== undefined) {
        if (access.visibility !== 'public' && access.visibility !== 'private') {
          await removeUploaded(req);
          return next({ message: 'Invalid access.visibility', statusCode: 400 } as AppError);
        }
        updates['access.visibility'] = access.visibility;
        touched = true;
      }

      if (access.visibility === 'public') {
        updates['access.lock'] = 'none';
        updates['access.unlockAt'] = undefined;
        touched = true;
      } else if (access.visibility === 'private' || access.visibility === undefined) {
        if (access.lock !== undefined) {
          if (access.lock !== 'none' && access.lock !== 'timed') {
            await removeUploaded(req);
            return next({ message: 'Invalid access.lock', statusCode: 400 } as AppError);
          }
          updates['access.lock'] = access.lock;
          touched = true;
        }

        const nextLock = access.lock ?? existing.access?.lock;
        const nextVisibility = access.visibility ?? existing.access?.visibility;

        if (nextVisibility === 'private' && nextLock === 'timed') {
          const unlockAt = access.unlockAt !== undefined ? new Date(access.unlockAt) : existing.access?.unlockAt;

          if (!unlockAt || isNaN(unlockAt.getTime())) {
            await removeUploaded(req);
            return next({
              message: 'unlockAt is required and must be a valid date when lock=timed',
              statusCode: 400,
            } as AppError);
          }
          if (unlockAt.getTime() <= Date.now()) {
            await removeUploaded(req);
            return next({
              message: 'unlockAt must be in the future for lock=timed',
              statusCode: 400,
            } as AppError);
          }

          updates['access.unlockAt'] = unlockAt;
          touched = true;
        } else if (nextLock === 'none') {
          updates['access.unlockAt'] = undefined;
          touched = true;
        }
      }
    }

    if (!touched) {
      return res.status(200).json({ message: 'Nothing to update' });
    }

    // build $set / $unset
    const $set: Record<string, any> = {};
    const $unset: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) $unset[k] = '';
      else $set[k] = v;
    }
    const updateOps: any = {};
    if (Object.keys($set).length) updateOps.$set = $set;
    if (Object.keys($unset).length) updateOps.$unset = $unset;

    const capsule = await Capsule.findOneAndUpdate({ _id: capsuleId, owner: userId }, updateOps, { new: true, runValidators: true, context: 'query' });

    if (!capsule) {
      await removeUploaded(req);
      return next({ message: 'Capsule not Found', statusCode: 404 } as AppError);
    }

    // ⬇️ delete previous file if removed or replaced
    if (removeImageRequested && prevImage) {
      await deleteImageBulletproof(prevImage);
    } else if (req.file?.path && prevImage && prevImage !== capsule.image) {
      await deleteImageBulletproof(prevImage);
    }

    return res.status(200).json({ message: 'Capsule Updated', capsule });
  } catch (error: any) {
    await removeUploaded(req);
    return next({ message: 'error in update capsule', statusCode: 500, data: error?.message } as AppError);
  }
};
