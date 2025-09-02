import { NextFunction, Request, Response } from 'express';
import { Types, FilterQuery } from 'mongoose';
import User from '../models/User';
import Capsule from '../models/Capsule';
import { CategoryGroup, CategoryItem } from '../models/Category';
import Notification from '../models/Notification';
import { AppError, AuthRequest, Flag, NotificationTypes, Role } from '../types/types';

/* ---------- Query / Body / Param types ---------- */

type GetUsersQuery = {
  page?: string;
  limit?: string;
  flag?: Flag;
  banned?: 'true' | 'false';
  sort?: 'newest' | 'oldest' | string;
};

type IdParam = { id: string };
type CapsuleParams = { id: string; capsuleId: string };

type GetUserCapsulesQuery = {
  page?: string;
  limit?: string;
  visibility?: 'public' | 'private';
  lock?: 'none' | 'timed';
  unlockOnly?: 'true' | 'false';
  categoryItem?: string; // comma-separated ObjectIds
  q?: string;
  sort?: 'newest' | 'oldest' | string;
};

type EditUserBody = {
  role?: Role;
  isBanned?: boolean;
  flag?: Flag;
};

type EditCapsuleBody = {
  title?: string;
  image?: string;
  description?: string;
  extra?: string;
  color?: string;
  categoryItem?: string; // ObjectId (string)
  access?: {
    visibility?: 'public' | 'private';
    lock?: 'none' | 'timed';
    unlockAt?: Date;
  };
};

type CreateCategoryParams = { titleId: string };
type EditCategoryParams = { titleId: string; itemId: string };
type DeleteCategoryParams = { titleId: string; itemId: string };
type CreateCategoryBody = { categoryItem: string };

type CreateNotificationBody = {
  text: string;
  type: NotificationTypes;
  title?: string;
  flag: Flag;
};
type DeleteNotificationParams = { notifId: string };

/* ------------------- Controllers ------------------- */

// List users (admin only)
export const getUsers = async (req: Request<unknown, unknown, unknown, GetUsersQuery> & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    const userRole: Role | undefined = req.user?.role;
    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (userRole !== 'admin') return next({ message: 'Admin only', statusCode: 403 } as AppError);

    const { page = '1', limit = '50', flag, banned, sort } = req.query;

    const pageNum: number = Math.max(1, parseInt(page, 10) || 1);
    const limitNum: number = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const where: FilterQuery<typeof User> = {};

    if (typeof flag !== 'undefined') {
      const allowedFlags: readonly Flag[] = ['none', 'sus', 'review', 'violation'] as const;
      if (!allowedFlags.includes(flag as Flag)) {
        return next({ message: 'Invalid flag value', statusCode: 400 } as AppError);
      }
      where.flag = flag as Flag;
    }

    if (typeof banned !== 'undefined') {
      if (banned !== 'true' && banned !== 'false') {
        return next({ message: 'Invalid banned value (use true | false)', statusCode: 400 } as AppError);
      }
      where.isBanned = banned === 'true';
    }

    const s: string = (sort || '').toLowerCase();
    const sortObj: Record<string, 1 | -1> = { createdAt: s === 'oldest' ? 1 : -1 };

    const [items, total] = await Promise.all([
      User.find(where)
        .select('-password')
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      User.countDocuments(where),
    ]);

    return res.status(200).json({
      items,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      sort: sortObj.createdAt === -1 ? 'newest' : 'oldest',
      filters: where,
    });
  } catch (error: any) {
    return next({ message: 'Failed to get users', statusCode: 500, data: error?.message } as AppError);
  }
};

// Get a user + their capsules (admin only)
export const getSingleUserWithCapsules = async (req: Request<IdParam, unknown, unknown, GetUserCapsulesQuery> & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    const userRole: Role | undefined = req.user?.role;
    const singleUserId: string = req.params.id;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (userRole !== 'admin') return next({ message: 'Admin only', statusCode: 403 } as AppError);

    if (!singleUserId) return next({ message: 'User not found', statusCode: 404 } as AppError);
    if (!Types.ObjectId.isValid(singleUserId)) return next({ message: 'Invalid user id', statusCode: 400 } as AppError);

    const user = await User.findById(singleUserId).lean();
    if (!user) return next({ message: 'User not found', statusCode: 404 } as AppError);

    const { page = '1', limit = '10', visibility, lock, unlockOnly, categoryItem, q, sort } = req.query;

    const pageNum: number = Math.max(1, parseInt(page, 10) || 1);
    const limitNum: number = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const now: Date = new Date();

    const and: FilterQuery<typeof Capsule>[] = [{ owner: new Types.ObjectId(singleUserId) }];

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
      const ids: Types.ObjectId[] = String(categoryItem)
        .split(',')
        .map((s) => s.trim())
        .filter(Types.ObjectId.isValid)
        .map((id) => new Types.ObjectId(id));
      if (ids.length === 0) return res.status(400).json({ message: 'Invalid categoryItem id(s)' });
      and.push({ categoryItem: { $in: ids } });
    }

    const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query: string = (q ?? '').trim();
    if (query) {
      const pattern: string = escapeRegExp(query);
      and.push({
        $or: [{ title: { $regex: pattern, $options: 'i' } }, { description: { $regex: pattern, $options: 'i' } }],
      });
    }

    const where: FilterQuery<typeof Capsule> = and.length === 1 ? and[0] : { $and: and };

    const s: string = (sort || '').toLowerCase();
    const dir: 1 | -1 = s === 'oldest' ? 1 : -1;
    const sortObj: Record<string, 1 | -1> = { createdAt: dir as 1 | -1 };

    const [items, total] = await Promise.all([
      Capsule.find(where)
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Capsule.countDocuments(where),
    ]);

    return res.status(200).json({
      message: 'User found',
      user,
      capsules: {
        items,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        sort: s === 'oldest' ? 'oldest' : 'newest',
      },
    });
  } catch (error: any) {
    return next({ message: 'Failed to get user', statusCode: 500, data: error?.message } as AppError);
  }
};

// Get one capsule of a user (admin only)
export const getSingleUserCapsule = async (req: Request<CapsuleParams> & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    const userRole: Role | undefined = req.user?.role;
    const { id: singleUserId, capsuleId } = req.params as CapsuleParams;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (userRole !== 'admin') return next({ message: 'Admin only', statusCode: 403 } as AppError);

    if (!singleUserId) return next({ message: 'User not found', statusCode: 404 } as AppError);
    if (!capsuleId) return next({ message: 'Capsule not found', statusCode: 404 } as AppError);

    if (!Types.ObjectId.isValid(singleUserId) || !Types.ObjectId.isValid(capsuleId)) {
      return next({ message: 'Invalid id', statusCode: 400 } as AppError);
    }

    const singleCapsule = await Capsule.findOne({ _id: capsuleId, owner: singleUserId }).lean();
    if (!singleCapsule) return next({ message: 'Capsule not found', statusCode: 404 } as AppError);

    return res.status(200).json({ message: 'Capsule found', singleCapsule });
  } catch (error: any) {
    return next({ message: 'Failed to get user', statusCode: 500, data: error?.message } as AppError);
  }
};

// Edit user fields (admin only)
export const editSingleUser = async (req: Request<IdParam, unknown, EditUserBody> & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    const userRole: Role | undefined = req.user?.role;
    const singleUserId: string = req.params.id;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (userRole !== 'admin') return next({ message: 'Admin only', statusCode: 403 } as AppError);
    if (!singleUserId) return next({ message: 'User not found', statusCode: 404 } as AppError);
    if (!Types.ObjectId.isValid(singleUserId)) return next({ message: 'Invalid user id', statusCode: 400 } as AppError);

    const body: EditUserBody = req.body;
    const update: Partial<{ role: Role; isBanned: boolean; flag: Flag }> = {};
    let touched: boolean = false;

    if (body.role !== undefined) {
      if (body.role === 'admin' || body.role === 'user') update.role = body.role;
      else return next({ message: 'Role must be admin | user', statusCode: 400 } as AppError);
      touched = true;
    }
    if (body.isBanned !== undefined) {
      if (typeof body.isBanned === 'boolean') update.isBanned = body.isBanned;
      else return next({ message: 'isBanned must be boolean', statusCode: 400 } as AppError);
      touched = true;
    }
    if (body.flag !== undefined) {
      const ok: readonly Flag[] = ['sus', 'none', 'violation', 'review'] as const;
      if (ok.includes(body.flag)) update.flag = body.flag;
      else return next({ message: 'Flag must be none | sus | violation | review', statusCode: 400 } as AppError);
      touched = true;
    }

    if (!touched) return res.status(200).json({ message: 'Nothing to update' });

    const updateUser = await User.findByIdAndUpdate(singleUserId, { $set: update }, { new: true, runValidators: true });
    if (!updateUser) return next({ message: 'User not found', statusCode: 404 } as AppError);

    return res.status(200).json({ message: 'Profile updated', user: updateUser });
  } catch (error: any) {
    return next({ message: 'Failed to update user', statusCode: 500, data: error?.message } as AppError);
  }
};

// Edit a user's capsule (admin only)
export const editSingleUserCapsule = async (req: Request<CapsuleParams, unknown, EditCapsuleBody> & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    const userRole: Role | undefined = req.user?.role;
    const { id: singleUserId, capsuleId } = req.params as CapsuleParams;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (userRole !== 'admin') return next({ message: 'Admin only', statusCode: 403 } as AppError);

    if (!Types.ObjectId.isValid(singleUserId) || !Types.ObjectId.isValid(capsuleId)) {
      return next({ message: 'Invalid id', statusCode: 400 } as AppError);
    }

    const existing = await Capsule.findOne({ _id: capsuleId, owner: singleUserId }).select('image access').lean();
    if (!existing) {
      return next({ message: 'Capsule not found', statusCode: 404 } as AppError);
    }

    const isTimedLocked: boolean = existing.access?.visibility === 'private' && existing.access?.lock === 'timed' && !!existing.access?.unlockAt && new Date(existing.access.unlockAt).getTime() > Date.now();

    const allowedKeys: (keyof EditCapsuleBody)[] = ['title', 'image', 'description', 'extra', 'color', 'categoryItem'];
    const updates: Record<string, unknown> = {};
    let touched: boolean = false;

    for (const key of allowedKeys) {
      const val = req.body[key as keyof EditCapsuleBody];
      if (val !== undefined) {
        updates[key === 'categoryItem' ? 'categoryItem' : key] = val as unknown;
        touched = true;
      }
    }

    const access: EditCapsuleBody['access'] | undefined = (req.body as any).access;

    if (access && typeof access === 'object') {
      // Block access changes while timed lock is active
      if (isTimedLocked) {
        return next({
          message: 'Access is locked (timed). You cannot change access until unlockAt.',
          statusCode: 400,
        } as AppError);
      }

      // Validate visibility
      if (access.visibility !== undefined) {
        if (access.visibility !== 'public' && access.visibility !== 'private') {
          return next({ message: 'Invalid access.visibility', statusCode: 400 } as AppError);
        }
        (updates as any)['access.visibility'] = access.visibility;
        touched = true;
      }

      // Public -> force lock none and unset unlockAt
      if (access.visibility === 'public') {
        (updates as any)['access.lock'] = 'none';
        (updates as any)['access.unlockAt'] = undefined;
        touched = true;
      } else if (access.visibility === 'private' || access.visibility === undefined) {
        // Validate lock
        if (access.lock !== undefined) {
          if (access.lock !== 'none' && access.lock !== 'timed') {
            return next({ message: 'Invalid access.lock', statusCode: 400 } as AppError);
          }
          (updates as any)['access.lock'] = access.lock;
          touched = true;
        }

        // Resolve next state
        const nextLock = access.lock ?? existing.access?.lock;
        const nextVisibility = access.visibility ?? existing.access?.visibility;

        if (nextVisibility === 'private' && nextLock === 'timed') {
          const unlockAt: Date | undefined = access.unlockAt !== undefined ? new Date(access.unlockAt) : existing.access?.unlockAt;

          if (!unlockAt || isNaN(unlockAt.getTime())) {
            return next({
              message: 'unlockAt is required and must be a valid date when lock=timed',
              statusCode: 400,
            } as AppError);
          }
          if (unlockAt.getTime() <= Date.now()) {
            return next({
              message: 'unlockAt must be in the future for lock=timed',
              statusCode: 400,
            } as AppError);
          }

          (updates as any)['access.unlockAt'] = unlockAt;
          touched = true;
        } else if (nextLock === 'none') {
          (updates as any)['access.unlockAt'] = undefined;
          touched = true;
        }
      }
    }

    if (!touched) return res.status(200).json({ message: 'Nothing to update' });

    const updateOps: any = { $set: updates };
    if ((updates as any)['access.lock'] === 'none' || (updates as any)['access.visibility'] === 'private') {
      updateOps.$unset = { 'access.unlockAt': '' };
    }

    const capsule = await Capsule.findOneAndUpdate({ _id: capsuleId, owner: singleUserId }, updateOps, { new: true, runValidators: true, context: 'query' });

    if (!capsule) return next({ message: 'Capsule not found', statusCode: 404 } as AppError);

    return res.status(200).json({ message: 'User capsule updated', capsule });
  } catch (error: any) {
    return next({ message: 'Failed to update user capsule', statusCode: 500, data: error.message } as AppError);
  }
};

// Get all categories (admin only)
export const getCategories = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    const userRole: Role | undefined = req.user?.role;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (userRole !== 'admin') return next({ message: 'Admin only', statusCode: 403 } as AppError);

    const categoryGroup = await CategoryGroup.find().select('+title');
    const categoryItems = await CategoryItem.find().select('+title');

    return res.status(200).json({ message: 'Categories found', categoryGroup, categoryItems });
  } catch (error: any) {
    return next({ message: 'Failed to get categories', statusCode: 500, data: error.message } as AppError);
  }
};

// Create a category item (admin only)
export const createCategory = async (req: Request<CreateCategoryParams, unknown, CreateCategoryBody> & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    const userRole: Role | undefined = req.user?.role;
    const { categoryItem: newCategoryItem } = req.body as CreateCategoryBody;
    const { titleId: categoryTitleId } = req.params as CreateCategoryParams;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (userRole !== 'admin') return next({ message: 'Admin only', statusCode: 403 } as AppError);

    if (!categoryTitleId) return next({ message: 'Category title is required', statusCode: 400 } as AppError);
    if (!Types.ObjectId.isValid(categoryTitleId)) return next({ message: 'Invalid category title id', statusCode: 400 } as AppError);

    if (!newCategoryItem || !newCategoryItem.trim()) return next({ message: 'Category item is required', statusCode: 400 } as AppError);

    const categoryGroup = await CategoryGroup.findById(categoryTitleId);
    if (!categoryGroup) return next({ message: 'Category title not found', statusCode: 404 } as AppError);

    const exists = await CategoryItem.findOne({ group: categoryTitleId, key: newCategoryItem });
    if (exists) return next({ message: 'Category item already exists', statusCode: 409 } as AppError);

    const categoryItem = await CategoryItem.create({ title: newCategoryItem, key: newCategoryItem, group: categoryTitleId });

    return res.status(201).json({ message: 'Category item created successfully', categoryItem });
  } catch (error: any) {
    return next({ message: 'Failed to update categories', statusCode: 500, data: error.message } as AppError);
  }
};

// Edit a category item (admin only)
export const editCategory = async (req: Request<EditCategoryParams, unknown, CreateCategoryBody> & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    const userRole: Role | undefined = req.user?.role;
    const { categoryItem: newCategoryItem } = req.body as CreateCategoryBody;
    const { itemId: categoryItemId, titleId: categoryTitleId } = req.params as EditCategoryParams;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (userRole !== 'admin') return next({ message: 'Admin only', statusCode: 403 } as AppError);

    if (!categoryTitleId) return next({ message: 'Category title is required', statusCode: 400 } as AppError);
    if (!categoryItemId) return next({ message: 'Category item is required', statusCode: 400 } as AppError);
    if (!Types.ObjectId.isValid(categoryTitleId) || !Types.ObjectId.isValid(categoryItemId)) {
      return next({ message: 'Invalid id', statusCode: 400 } as AppError);
    }
    if (!newCategoryItem || !newCategoryItem.trim()) return next({ message: 'Category item is required', statusCode: 400 } as AppError);

    const categoryGroup = await CategoryGroup.findById(categoryTitleId);
    if (!categoryGroup) return next({ message: 'Category title not found', statusCode: 404 } as AppError);

    const categoryItem = await CategoryItem.findOneAndUpdate({ _id: categoryItemId, group: categoryTitleId }, { $set: { title: newCategoryItem, key: newCategoryItem } }, { runValidators: true, new: true });

    if (!categoryItem) return next({ message: 'Category item not found', statusCode: 404 } as AppError);

    return res.status(200).json({ message: 'Category item updated successfully', categoryItem });
  } catch (error: any) {
    return next({ message: 'Failed to update categories', statusCode: 500, data: error.message } as AppError);
  }
};

// Delete a category item (admin only)
export const deleteCategory = async (req: Request<DeleteCategoryParams> & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    const userRole: Role | undefined = req.user?.role;
    const { itemId: categoryItemId, titleId: categoryTitleId } = req.params as DeleteCategoryParams;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (userRole !== 'admin') return next({ message: 'Admin only', statusCode: 403 } as AppError);

    if (!categoryTitleId) return next({ message: 'Category title is required', statusCode: 400 } as AppError);
    if (!categoryItemId) return next({ message: 'Category item is required', statusCode: 400 } as AppError);
    if (!Types.ObjectId.isValid(categoryTitleId) || !Types.ObjectId.isValid(categoryItemId)) {
      return next({ message: 'Invalid id', statusCode: 400 } as AppError);
    }

    const categoryGroup = await CategoryGroup.findById(categoryTitleId);
    if (!categoryGroup) return next({ message: 'Category title not found', statusCode: 404 } as AppError);

    const categoryItem = await CategoryItem.findOneAndDelete({ _id: categoryItemId, group: categoryTitleId });
    if (!categoryItem) return next({ message: 'Category item not found', statusCode: 404 } as AppError);

    return res.status(200).json({ message: 'Category item deleted successfully' });
  } catch (error: any) {
    return next({ message: 'Failed to delete categories', statusCode: 500, data: error.message } as AppError);
  }
};

// Create a notification for users with a flag (admin only)
export const createNotification = async (req: Request<unknown, unknown, CreateNotificationBody> & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId: string | undefined = req.user?.id;
    const userRole: Role | undefined = req.user?.role;
    const { text, type, title } = req.body as CreateNotificationBody;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (userRole !== 'admin') return next({ message: 'Admin only', statusCode: 403 } as AppError);
    if (!text || !text.trim()) return next({ message: 'Text is required', statusCode: 400 } as AppError);

    if (!type || !type.trim()) return next({ message: 'type is required', statusCode: 400 } as AppError);

    const finalTitle: string = title ?? 'پیام جدید';

    const newNotification = await Notification.create({ text, title: finalTitle, type });

    return res.status(201).json({ message: 'Notification created successfully', newNotification });
  } catch (error: any) {
    return next({ message: 'Failed to create notification', statusCode: 500, data: error.message } as AppError);
  }
};

// Delete a notification (admin only)
export const deleteNotification = async (req: Request<DeleteNotificationParams> & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { notifId } = req.params as DeleteNotificationParams;
    const userId: string | undefined = req.user?.id;
    const userRole: Role | undefined = req.user?.role;

    if (!userId) return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    if (userRole !== 'admin') return next({ message: 'Admin only', statusCode: 403 } as AppError);

    if (!Types.ObjectId.isValid(notifId)) {
      return next({ message: 'Invalid notification id', statusCode: 400 } as AppError);
    }

    const deleted = await Notification.findByIdAndDelete(notifId);
    if (!deleted) return next({ message: 'Notification not found', statusCode: 404 } as AppError);

    return res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error: any) {
    return next({ message: 'Failed to delete notification', statusCode: 500, data: error.message } as AppError);
  }
};
