import { NextFunction, Request, Response } from 'express';
import Capsule from '../models/Capsule';
import { FilterQuery, Types } from 'mongoose';
import { deleteImageBulletproof, toImagesRelative } from '../helper/fileCleanup';
import { AppError, AuthRequest } from '../types/types';
import { removeUploaded } from '../helper/remover';
import User from '../models/User';

/* ------------ GET /capsules ------------ */
export const getCapsules = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id; // current user id
    if (!userId) {
      await removeUploaded(req);
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    // pagination & filters from query
    const { page = '1', limit = '10', visibility, lock, unlockOnly, categoryItem, q, sort } = req.query as Record<string, string>;

    const pageNum: number = Math.max(1, parseInt(page, 10) || 1);
    const limitNum: number = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const now: Date = new Date();

    // base filter: only owner documents
    const and: FilterQuery<typeof Capsule>[] = [{ owner: new Types.ObjectId(userId) }];

    // visibility filter
    if (visibility === 'public' || visibility === 'private') {
      and.push({ 'access.visibility': visibility });
    }
    // lock filter
    if (lock === 'none' || lock === 'timed') {
      and.push({ 'access.lock': lock });
    }
    // unlocked only (no lock or timed unlock reached)
    if (unlockOnly === 'true') {
      and.push({
        $or: [{ 'access.lock': 'none' }, { $and: [{ 'access.lock': 'timed' }, { 'access.unlockAt': { $lte: now } }] }],
      });
    }

    // categoryItem filter (comma-separated ids)
    if (categoryItem) {
      const ids: Types.ObjectId[] = String(categoryItem)
        .split(',')
        .map((s) => s.trim())
        .filter(Types.ObjectId.isValid)
        .map((id) => new Types.ObjectId(id));
      if (ids.length === 0) return res.status(400).json({ message: 'Invalid categoryItem id(s)' });

      and.push({ categoryItem: { $in: ids } });
    }

    // text search on title/description (escaped regex)
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query: string = (q ?? '').trim();
    if (query) {
      const pattern: string = escapeRegExp(query);
      and.push({
        $or: [{ title: { $regex: pattern, $options: 'i' } }, { description: { $regex: pattern, $options: 'i' } }],
      });
    }

    // combine filters
    const where: FilterQuery<typeof Capsule> = and.length === 1 ? and[0] : { $and: and };

    // sort (newest default)
    const s = (sort || '').toLowerCase();
    const dir: 1 | -1 = s === 'oldest' ? 1 : -1;
    const sortObj: Record<string, 1 | -1> = { createdAt: dir as 1 | -1 };

    // query & count in parallel
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
  try {
    const userId: string | undefined = req.user?.id;
    const { title, description } = req.body as Record<string, any>;
    let { access, categoryItem } = req.body as any;

    if (!userId) {
      await removeUploaded(req);
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    const user = await User.findById(userId);
    if (!user) return next({ message: 'user not found', statusCode: 404 } as AppError);

    // basic required fields
    if (!title || !description || !access || !categoryItem) {
      await removeUploaded(req);
      return next({
        message: 'title, description, categoryItem and access are required',
        statusCode: 400,
      } as AppError);
    }

    // categoryItem validation
    if (!Types.ObjectId.isValid(categoryItem)) {
      await removeUploaded(req);
      return next({ message: 'Invalid categoryItem id', statusCode: 400 } as AppError);
    }

    // parse access if string (multipart)
    if (typeof access === 'string') {
      try {
        access = JSON.parse(access);
      } catch {
        await removeUploaded(req);
        return next({ message: 'Invalid access JSON', statusCode: 400 } as AppError);
      }
    }

    // allowlist for access fields
    const allowedVisibility = ['public', 'private'] as const;
    const allowedLock = ['none', 'timed'] as const;

    const normalizedAccess: any = {
      ...(access?.visibility !== undefined ? { visibility: access.visibility } : {}),
      ...(access?.lock !== undefined ? { lock: access.lock } : {}),
      ...(access?.unlockAt !== undefined ? { unlockAt: access.unlockAt } : {}),
    };

    // validate access.visibility
    if (normalizedAccess.visibility && !allowedVisibility.includes(normalizedAccess.visibility)) {
      await removeUploaded(req);
      return next({ message: 'Invalid access.visibility', statusCode: 400 } as AppError);
    }
    // validate access.lock
    if (normalizedAccess.lock && !allowedLock.includes(normalizedAccess.lock)) {
      await removeUploaded(req);
      return next({ message: 'Invalid access.lock', statusCode: 400 } as AppError);
    }

    // public -> no timed lock
    if (normalizedAccess.visibility === 'public') {
      normalizedAccess.lock = 'none';
      delete normalizedAccess.unlockAt;
    }

    // timed lock constraints
    if (normalizedAccess.lock === 'timed') {
      if (normalizedAccess.visibility !== 'private') {
        await removeUploaded(req);
        return next({ message: 'timed lock is only allowed with private visibility', statusCode: 400 } as AppError);
      }
      if (!normalizedAccess.unlockAt) {
        await removeUploaded(req);
        return next({ message: 'unlockAt is required when lock is timed', statusCode: 400 } as AppError);
      }
      const unlockDate: Date = new Date(normalizedAccess.unlockAt);
      if (isNaN(unlockDate.getTime()) || unlockDate.getTime() <= Date.now()) {
        await removeUploaded(req);
        return next({ message: 'unlockAt must be a valid future date', statusCode: 400 } as AppError);
      }
      normalizedAccess.unlockAt = unlockDate;
    }

    // build document
    const doc: any = {
      title,
      description,
      categoryItem: new Types.ObjectId(categoryItem),
      owner: new Types.ObjectId(userId),
      ...(Object.keys(normalizedAccess).length && { access: normalizedAccess }),
      ...(req.body.color !== undefined && { color: (req.body as any).color }),
      ...(req.body.extra !== undefined && { extra: (req.body as any).extra }),
    };

    // store image relative path if uploaded
    if (req.file?.path) {
      const normalized = req.file.path.replace(/\\/g, '/');
      doc.image = toImagesRelative(normalized);
    }

    const FLAG_LIMIT_REVIEW = 5;
    const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
    const AUTO_INIT_LOCK_FOR_VIOLATION = true;

    const flag = (user.flag ?? 'none') as 'none' | 'sus' | 'review' | 'violation';

    if (flag === 'violation') {
      const now = new Date();
      let lockUntil: Date | null = user?.moderation?.violation?.lockUntil ?? null;

      if (!lockUntil && AUTO_INIT_LOCK_FOR_VIOLATION) {
        lockUntil = new Date(now.getTime() + WINDOW_MS);
        await User.updateOne({ _id: user._id }, { $set: { 'moderation.violation.lockUntil': lockUntil } });
      }

      if (lockUntil && lockUntil > now) {
        await removeUploaded(req);
        return res.status(403).json({
          message: 'You are temporarily blocked from creating capsules due to violation.',
          capsule: null,
          meta: { userFlag: flag, lockUntil },
        });
      }
    }

    if (flag === 'review') {
      const since = new Date(Date.now() - WINDOW_MS);

      const createdCount = await Capsule.countDocuments({
        owner: user._id,
        createdAt: { $gte: since },
      });

      if (createdCount >= FLAG_LIMIT_REVIEW) {
        await removeUploaded(req);
        return res.status(429).json({
          message: 'Weekly creation limit reached for review-flagged users.',
          capsule: null,
          meta: { userFlag: flag, window: '7d', limit: FLAG_LIMIT_REVIEW, used: createdCount },
        });
      }
    }

    let message = 'Capsule created successfully';
    if (flag === 'sus') {
      res.set('X-Moderation-Warning', 'Your account is under soft monitoring (flag: sus).');
      message = 'Capsule created (soft monitored).';
    }
    if (flag === 'review') {
      message = 'Capsule created (review account; weekly limit applies).';
    }

    const newCapsule = await Capsule.create(doc);

    return res.status(201).json({
      message,
      capsule: newCapsule,
      meta: { userFlag: user.flag, moderation: (doc as any).moderation ?? null },
    });
  } catch (error: any) {
    // cleanup uploaded file on error
    try {
      if (error?.name === 'ValidationError' || error) {
        if (req.file?.path) {
          const normalized = req.file.path.replace(/\\/g, '/');
          await deleteImageBulletproof(toImagesRelative(normalized));
        }
      }
    } catch {}
    return next({ message: 'Failed to create capsule', statusCode: 500, data: error?.message } as AppError);
  }
};

/* ------------ GET /capsules/:id ------------ */
export const getSingleCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const capsuleId: string = req.params.id;
    const userId: string | undefined = req.user?.id;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (!Types.ObjectId.isValid(capsuleId)) {
      return next({ message: 'Invalid capsule id', statusCode: 400 } as AppError);
    }

    // fetch one by id & owner
    const capsule = await Capsule.findOne({ _id: capsuleId, owner: userId }).lean();
    if (!capsule) {
      return next({ message: 'Capsule not found', statusCode: 404 } as AppError);
    }

    return res.status(200).json({ message: 'Capsule found', capsule });
  } catch (error: any) {
    return next({ message: 'Failed to get capsule', statusCode: 500, data: error?.message } as AppError);
  }
};

/* ------------ DELETE /capsules/:id ------------ */
export const deleteCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    const capsuleId: string = req.params.id;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (!Types.ObjectId.isValid(capsuleId)) {
      return next({ message: 'Invalid capsule id', statusCode: 400 } as AppError);
    }

    // find first (to get image path), then delete
    const existing = await Capsule.findOne({ _id: capsuleId, owner: userId }).select('image').lean();
    if (!existing) {
      return next({ message: 'Capsule not found', statusCode: 404 } as AppError);
    }

    await Capsule.deleteOne({ _id: capsuleId, owner: userId });

    // delete image file after DB delete
    if ((existing as any).image) {
      await deleteImageBulletproof((existing as any).image as string);
    }

    return res.status(200).json({ message: 'Capsule deleted' });
  } catch (error: any) {
    return next({ message: 'Failed to delete capsule', statusCode: 500, data: error?.message } as AppError);
  }
};

/* ------------ PATCH /capsules/:id ------------ */
export const editCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const capsuleId: string = req.params.id;
    const userId: string | undefined = req.user?.id;

    if (!userId) {
      await removeUploaded(req);
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }
    if (!Types.ObjectId.isValid(capsuleId)) {
      await removeUploaded(req);
      return next({ message: 'Invalid capsule id', statusCode: 400 } as AppError);
    }

    // parse access when sent as JSON string (multipart)
    if (typeof (req.body as any).access === 'string') {
      try {
        (req.body as any).access = JSON.parse((req.body as any).access);
      } catch {}
    }

    // fetch existing to know previous image path & access state
    const existing = await Capsule.findOne({ _id: capsuleId, owner: userId }).select('image access').lean();
    if (!existing) {
      await removeUploaded(req);
      return next({ message: 'Capsule not found', statusCode: 404 } as AppError);
    }
    const prevImage: string | undefined = (existing as any).image as string | undefined;

    // check timed lock active state
    const isTimedLocked: boolean = (existing as any).access?.visibility === 'private' && (existing as any).access?.lock === 'timed' && (existing as any).access?.unlockAt && new Date((existing as any).access.unlockAt).getTime() > Date.now();

    // map of allowed fields (simple updates)
    const allowed = ['title', 'description', 'extra', 'color', 'categoryItem'] as const;
    const updates: Record<string, any> = {};
    let touched: boolean = false;

    // assign allowed fields
    for (const key of allowed) {
      const val = (req.body as any)[key];
      if (val !== undefined) {
        updates[key] = key === 'categoryItem' && Types.ObjectId.isValid(val) ? new Types.ObjectId(val) : val;
        touched = true;
      }
    }

    // upload new image (store relative)
    if (req.file?.path) {
      const normalized = req.file.path.replace(/\\/g, '/');
      updates.image = toImagesRelative(normalized);
      touched = true;
    }

    // remove image request via flags
    const removeImageRequested: boolean = (req.body as any).image === '' || (req.body as any).removeImage === 'true';
    if (removeImageRequested) {
      updates.image = undefined; // will translate to $unset
      touched = true;
    }

    // access object updates (visibility/lock/unlockAt)
    const access = (req.body as any).access;

    if (access && typeof access === 'object') {
      // forbid access changes while timed lock active
      if (isTimedLocked) {
        return next({
          message: 'Access is locked (timed). You cannot change access until unlockAt.',
          statusCode: 400,
        } as AppError);
      }

      // validate & set visibility
      if (access.visibility !== undefined) {
        if (access.visibility !== 'public' && access.visibility !== 'private') {
          await removeUploaded(req);
          return next({ message: 'Invalid access.visibility', statusCode: 400 } as AppError);
        }
        updates['access.visibility'] = access.visibility;
        touched = true;
      }

      // public -> force no lock/unlockAt
      if (access.visibility === 'public') {
        updates['access.lock'] = 'none';
        updates['access.unlockAt'] = undefined;
        touched = true;
      } else if (access.visibility === 'private' || access.visibility === undefined) {
        // lock field
        if (access.lock !== undefined) {
          if (access.lock !== 'none' && access.lock !== 'timed') {
            await removeUploaded(req);
            return next({ message: 'Invalid access.lock', statusCode: 400 } as AppError);
          }
          updates['access.lock'] = access.lock;
          touched = true;
        }

        // resolve next state using incoming or existing
        const nextLock = access.lock ?? (existing as any).access?.lock;
        const nextVisibility = access.visibility ?? (existing as any).access?.visibility;

        // timed lock requires future unlockAt
        if (nextVisibility === 'private' && nextLock === 'timed') {
          const unlockAt: Date | undefined = access.unlockAt !== undefined ? new Date(access.unlockAt) : (existing as any).access?.unlockAt;

          if (!unlockAt || isNaN(new Date(unlockAt).getTime())) {
            await removeUploaded(req);
            return next({
              message: 'unlockAt is required and must be a valid date when lock=timed',
              statusCode: 400,
            } as AppError);
          }
          if (new Date(unlockAt).getTime() <= Date.now()) {
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

    // no changes -> early return
    if (!touched) {
      return res.status(200).json({ message: 'Nothing to update' });
    }

    // build $set / $unset payloads
    const $set: Record<string, any> = {};
    const $unset: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) $unset[k] = '';
      else $set[k] = v;
    }
    const updateOps: any = {};
    if (Object.keys($set).length) updateOps.$set = $set;
    if (Object.keys($unset).length) updateOps.$unset = $unset;

    // apply update with validation
    const capsule = await Capsule.findOneAndUpdate({ _id: capsuleId, owner: userId }, updateOps, { new: true, runValidators: true, context: 'query' });

    if (!capsule) {
      await removeUploaded(req);
      return next({ message: 'Capsule not found', statusCode: 404 } as AppError);
    }

    // delete previous file if removed/replaced
    if (removeImageRequested && prevImage) {
      await deleteImageBulletproof(prevImage);
    } else if (req.file?.path && prevImage && prevImage !== (capsule as any).image) {
      await deleteImageBulletproof(prevImage);
    }

    return res.status(200).json({ message: 'Capsule updated', capsule });
  } catch (error: any) {
    await removeUploaded(req);
    return next({ message: 'Failed to update capsule', statusCode: 500, data: error?.message } as AppError);
  }
};
