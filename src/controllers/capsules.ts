import { NextFunction, Request, Response } from 'express';
import Capsule from '../models/Capsule';
import { AppError, AuthRequest } from '../types/todo';
import { Types } from 'mongoose';

export const getCapsules = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    const { page = '1', limit = '10', visibility, lock, unlockOnly, categoryItem, q, sort } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const now = new Date();

    const and: any[] = [{ owner: userId }];

    if (visibility === 'public' || visibility === 'private') {
      and.push({ 'access.visibility': visibility });
    }

    if (lock === 'none' || lock === 'timed') {
      and.push({ 'access.lock': lock });
    }

    if (unlockOnly === 'true') {
      and.push({ $or: [{ 'access.lock': 'none' }, { $and: [{ 'access.lock': 'timed' }, { 'access.unlockAt': { $lte: now } }] }] });
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
      and.push({
        $or: [{ title: { $regex: pattern, $options: 'i' } }, { description: { $regex: pattern, $options: 'i' } }],
      });
    }

    const where = and.length === 1 ? and[0] : { $and: and };

    const s = (sort || '').toLowerCase();
    const dir: 1 | -1 = s === 'oldest' ? 1 : -1;

    const sortObj = { createdAt: dir };

    const [items, total] = await Promise.all([
      Capsule.find(where)
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Capsule.countDocuments(where),
    ]);

    return res.json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      sort: dir === -1 ? 'newest' : 'oldest',
      filters: where,
    });
  } catch (error) {
    return next({
      message: 'Failed to get capsules',
      statusCode: 500,
      data: error,
    } as AppError);
  }
};

export const createCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { title, description, access, categoryItem } = req.body;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (!title || !description || !access || !categoryItem) {
      return next({
        message: 'title , description , category and access required!',
        statusCode: 401,
      });
    }

    let normalizedAccess = access;
    if (access) {
      normalizedAccess = {
        ...(access.visibility !== undefined ? { visibility: access.visibility } : {}),
        ...(access.lock !== undefined ? { lock: access.lock } : {}),
        ...(access.unlockAt !== undefined ? { unlockAt: access.unlockAt } : {}),
      };
      if (normalizedAccess.visibility === 'private') {
        normalizedAccess.lock = 'none';
        delete normalizedAccess.unlockAt;
      }
    }

    const doc: any = {
      title,
      description,
      categoryItem,
      owner: userId,
      ...(normalizedAccess !== undefined && { access: normalizedAccess }),
      ...(req.body.color !== undefined && { color: req.body.color }),
      ...(req.body.image !== undefined && { image: req.body.image }),
      ...(req.body.extra !== undefined && { extra: req.body.extra }),
    };

    const newCapsule = await Capsule.create(doc);
    return res.status(201).json({ message: 'Capsule Created Successfully', newCapsule });
  } catch (error: any) {
    return next({
      message: 'Created Capsule Failed',
      statusCode: 500,
      data: error.message,
    } as AppError);
  }
};

export const getSingleCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const capsuleId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    const capsule = await Capsule.find({ _id: capsuleId, owner: userId });

    if (!capsule) {
      return next({
        message: 'Capsule not Found',
        statusCode: 404,
      });
    }

    res.status(201).json({ message: 'Capsule Found!', capsule });
  } catch (error) {
    return next({
      message: 'error in find single capsule',
      statusCode: 500,
      data: error,
    });
  }
};

export const deleteCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const capsuleId = req.params.id;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    const capsule = await Capsule.findOneAndDelete({ _id: capsuleId, owner: userId });

    if (!capsule) {
      return next({
        message: 'Capsule not Found',
        statusCode: 404,
      });
    }

    res.status(201).json({ message: 'Capsule Deleted!' });
  } catch (error) {
    return next({
      message: 'error in delete single capsule',
      statusCode: 500,
      data: error,
    });
  }
};

export const editCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const capsuleId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    const allowed = ['title', 'image', 'description', 'extra', 'color', 'category'] as const;
    const updates: any = {};
    for (const key of allowed) {
      const val = (req.body as any)[key];
      if (val !== undefined) updates[key] = val;
    }

    if (req.body?.access?.visibility !== undefined) {
      updates['access.visibility'] = req.body.access.visibility;
      if (req.body.access.visibility === 'private') {
        updates['access.lock'] = 'none';
        updates['access.unlockAt'] = undefined;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(200).json({ message: 'Nothing to update' });
    }

    const updateOps: any = { $set: updates };
    if (updates['access.lock'] === 'none') {
      updateOps.$unset = { 'access.unlockAt': '' };
    }

    const capsule = await Capsule.findOneAndUpdate({ _id: capsuleId, owner: userId }, updateOps, {
      new: true,
      runValidators: true,
      context: 'query',
    });

    if (!capsule) {
      return next({
        message: 'Capsule not Found',
        statusCode: 404,
      });
    }

    return res.status(201).json({ message: 'Capsule Updated', capsule });
  } catch (error) {
    return next({
      message: 'error in update capsule',
      statusCode: 500,
      data: error,
    });
  }
};
