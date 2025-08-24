import { NextFunction, Request, Response } from 'express';
import User from '../models/User';
import { AppError } from '../types/todo';

export const getAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const admin = await User.findOne({ email });
    if (!admin) {
      return next({
        message: 'Admin not Found',
        statusCode: 404,
      } as AppError);
    }
    if (admin.role !== 'admin') {
      return next({
        message: 'only admin can access',
        statusCode: 401,
      } as AppError);
    }
  } catch (error) {}
};
