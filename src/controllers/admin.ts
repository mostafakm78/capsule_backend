import { NextFunction, Request, Response } from 'express';
import User from '../models/User';
import { AppError, AuthRequest, Flag, NotificationTypes, Role } from '../types/todo';
import bcrypt from 'bcryptjs';
import Capsule from '../models/Capsule';
import { Types } from 'mongoose';
import { CategoryGroup, CategoryItem } from '../models/Category';
import Notification from '../models/Notification';

export const getAdmin = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    console.log(userId);

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    const admin = await User.findById(userId).select('-password').lean();
    if (!admin) {
      return next({
        message: 'Admin not Found',
        statusCode: 404,
      } as AppError);
    }
    if (admin.role !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    return res.status(200).json({ message: 'admin Found', admin });
  } catch (error: any) {
    next({
      message: 'cant find user!',
      data: error.message,
      statusCode: 500,
    } as AppError);
  }
};

export const updateAdmin = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
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
          else user[key] = val as string;
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
        message: 'admin not Found',
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
        else user[key] = val as string;
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
      message: 'error in update admin',
      statusCode: 500,
      data: error.message,
    });
  }
};

export const getUsers = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    const { page = '1', limit = '50', flag, banned, sort } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const where: Record<string, any> = {};

    if (typeof flag !== 'undefined') {
      const allowedFlags = ['none', 'sus', 'review', 'violation'] as const;
      if (!allowedFlags.includes(flag as any)) {
        return next({
          message: 'Invalid flag value',
          statusCode: 400,
        });
      }
      where.flag = flag;
    }

    if (typeof banned !== 'undefined') {
      if (banned !== 'true' && banned !== 'false') {
        return next({
          message: 'Invalid banned value (use true | false)',
        });
      }
      where.isBanned = banned === 'true';
    }

    const s = (sort || '').toLowerCase();
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
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      sort: sortObj.createdAt === -1 ? 'newest' : 'oldest',
      filters: where,
    });
  } catch (error: any) {
    return next({
      message: 'Failed to get users',
      statusCode: 500,
      data: error?.message,
    } as AppError);
  }
};

export const getSingleUserWithCapsules = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const singleUserId = req.params.id;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    if (!singleUserId) {
      return next({
        message: 'User not found',
        statusCode: 404,
      } as AppError);
    }

    const user = await User.findById(singleUserId).lean();

    if (!user) {
      return next({
        message: 'user not Found!',
        statusCode: 404,
      } as AppError);
    }

    const { page = '1', limit = '10', visibility, lock, unlockOnly, categoryItem, q, sort } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const now = new Date();

    const and: any[] = [{ owner: new Types.ObjectId(singleUserId) }];
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

    return res.status(200).json({
      message: 'user Found!',
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
    return next({
      message: 'Failed to get user',
      statusCode: 500,
      data: error?.message,
    } as AppError);
  }
};

export const getSingleUserCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const singleUserId = req.params.id;
    const capsuleId = req.params.capsuleId;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    if (!singleUserId) {
      return next({
        message: 'User not found',
        statusCode: 404,
      });
    }

    if (!capsuleId) {
      return next({
        message: 'Capsule not Found',
        statusCode: 404,
      });
    }

    const singleCapsule = await Capsule.find({ _id: capsuleId, owner: singleUserId });

    res.status(200).json({ message: 'capsule Found', singleCapsule });
  } catch (error: any) {
    return next({
      message: 'Failed to get user',
      statusCode: 500,
      data: error?.message,
    } as AppError);
  }
};

export const editSingleUser = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const singleUserId = req.params.id;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    if (!singleUserId) {
      return next({
        message: 'User not found',
        statusCode: 404,
      });
    }

    const allowed = ['role', 'isBanned', 'flag'] as const;
    const body = req.body as Record<string, unknown>;

    const update: Partial<{ role: Role; isBanned: boolean; flag: Flag }> = {};

    let touched: boolean = false;
    for (const key of allowed) {
      const val = body[key];
      if (val === undefined) continue;

      touched = true;
      if (key === 'role') {
        if (val === 'admin' || val === 'user') {
          update.role = val;
        } else {
          return next({
            message: 'role can be only admin | user',
            statusCode: 401,
          });
        }
      }
      if (key === 'isBanned') {
        if (val === true || val === false) {
          update.isBanned = val;
        } else {
          return next({
            message: 'isBanned can be only boolean',
            statusCode: 401,
          });
        }
      }
      if (key === 'flag') {
        if (val === 'sus' || val === 'none' || val === 'violation' || val === 'review') {
          update.flag = val;
        } else {
          return next({
            message: 'flag can be only none | sus | violation | review',
            statusCode: 401,
          });
        }
      }
    }

    if (!touched) {
      res.status(200).json({ message: 'nothing to update' });
    }

    const updateUser = await User.findByIdAndUpdate(singleUserId, { $set: update }, { new: true, runValidators: true });

    if (!updateUser) {
      return next({
        message: 'User not Found',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      message: 'Profile Updated',
      user: updateUser,
    });
  } catch (error: any) {
    return next({
      message: 'Failed to update user',
      statusCode: 500,
      data: error?.message,
    } as AppError);
  }
};

export const editSingleUserCapsule = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const singleUserId = req.params.id;
    const capsuleId = req.params.capsuleId;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    if (!singleUserId) {
      return next({
        message: 'User not found',
        statusCode: 404,
      });
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

    const capsule = await Capsule.findOneAndUpdate({ _id: capsuleId, owner: singleUserId }, updateOps, {
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

    return res.status(201).json({ message: 'User Capsule Updated', capsule });
  } catch (error: any) {
    return next({
      message: 'error in update user capsule',
      statusCode: 500,
      data: error.message,
    });
  }
};

export const getCategories = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    const categoryGroup = await CategoryGroup.find().select('+title');
    const categoryItems = await CategoryItem.find().select('+title');

    res.status(200).json({ message: 'Categories Found', categoryGroup, categoryItems });
  } catch (error: any) {
    return next({
      message: 'error in get Categories',
      statusCode: 500,
      data: error.message,
    });
  }
};

export const createCategory = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const newCategoryItem = req.body.categoryItem;
    const categoryTitleId = req.params.titleId;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    if (!categoryTitleId) {
      return next({
        message: 'Category Title is required',
        statusCode: 401,
      });
    }

    if (!newCategoryItem) {
      return next({
        message: 'category item is required',
        statusCode: 401,
      });
    }

    const categoryGroup = await CategoryGroup.findById(categoryTitleId);

    if (!categoryGroup) {
      return next({
        message: 'category title is required',
        statucCode: 401,
      });
    }

    const categoryItem = await CategoryItem.create({ title: newCategoryItem, key: newCategoryItem, group: categoryTitleId });

    res.status(200).json({ message: 'category item created successfully', categoryItem });
  } catch (error: any) {
    return next({
      message: 'error in update Categories',
      statusCode: 500,
      data: error.message,
    });
  }
};

export const editCategory = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const newCategoryItem = req.body.categoryItem;
    const categoryItemId = req.params.itemId;
    const categoryTitleId = req.params.titleId;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    if (!categoryTitleId) {
      return next({
        message: 'Category Title is required',
        statusCode: 401,
      });
    }

    if (!categoryItemId) {
      return next({
        message: 'Category Item is required',
        statusCode: 401,
      });
    }

    if (!newCategoryItem) {
      return next({
        message: 'category item is required',
        statusCode: 401,
      });
    }

    const categoryGroup = await CategoryGroup.findById(categoryTitleId);

    if (!categoryGroup) {
      return next({
        message: 'category title is required',
        statucCode: 401,
      });
    }

    const categoryItem = await CategoryItem.findOneAndUpdate({ _id: categoryItemId, group: categoryTitleId }, { $set: { title: newCategoryItem, key: newCategoryItem } }, { runValidators: true, new: true });

    if (!categoryItem) {
      return next({
        message: 'category item is required',
        statucCode: 401,
      });
    }

    res.status(200).json({ message: 'category Item updated successfully', categoryItem });
  } catch (error: any) {
    return next({
      message: 'error in update Categories',
      statusCode: 500,
      data: error.message,
    });
  }
};

export const deleteCategory = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const categoryItemId = req.params.itemId;
    const categoryTitleId = req.params.titleId;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    if (!categoryTitleId) {
      return next({
        message: 'Category Title is required',
        statusCode: 401,
      });
    }

    if (!categoryItemId) {
      return next({
        message: 'category item is required',
        statusCode: 401,
      });
    }

    const categoryGroup = await CategoryGroup.findById(categoryTitleId);

    if (!categoryGroup) {
      return next({
        message: 'category title is required',
        statucCode: 401,
      });
    }

    const categoryItem = await CategoryItem.findOneAndDelete({ _id: categoryItemId, group: categoryTitleId });

    if (!categoryItem) {
      return next({
        message: 'category item is required',
        statucCode: 401,
      });
    }

    res.status(200).json({ message: 'category item deleted successfully' });
  } catch (error: any) {
    return next({
      message: 'error in delete Categories',
      statusCode: 500,
      data: error.message,
    });
  }
};

export const createNotification = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const text: string = req.body.text;
    const type: NotificationTypes = req.body.type;
    let title: string | undefined = req.body.title;
    const usersFlag: Flag = req.body.flag;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    if (!text) {
      return next({
        message: 'text is required',
        statusCode: 401,
      });
    }

    if (type !== 'alert' && type !== 'message' && type !== 'news' && type !== 'system') {
      return next({
        message: 'type must be system | news | message | alert',
        statusCode: 400,
      });
    }

    if (!usersFlag) {
      return next({
        message: 'usersFlag is required',
        statusCode: 400,
      });
    }

    if (title === undefined) title = 'پیام جدید';

    const flagedUsers = await User.find({ flag: usersFlag });

    const userIds = flagedUsers.map((user) => user._id);

    const newNotification = await Notification.create({ text, title, type, users: userIds });

    res.status(200).json({ message: 'Notification created successfully', newNotification });
  } catch (error: any) {
    return next({
      message: 'error in create Notification',
      statusCode: 500,
      data: error.message,
    });
  }
};

export const deleteNotification = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifId = req.params.notifId;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return next({
        message: 'Authentication required',
        statusCode: 401,
      } as AppError);
    }

    if (userRole !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 403,
      } as AppError);
    }

    const newNotification = await Notification.findByIdAndDelete(notifId);

    if (!newNotification) {
      return next({
        message: 'noification Id is required',
        statusCode: 400,
      });
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error: any) {
    return next({
      message: 'error in delete Notification',
      statusCode: 500,
      data: error.message,
    });
  }
};
