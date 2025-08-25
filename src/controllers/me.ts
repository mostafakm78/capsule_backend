import { NextFunction, Request, Response } from 'express';
import { AppError, AuthRequest } from '../types/todo';
import User from '../models/User';

export const getUser = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { email } = req.body;
    const user = await User.findOne({ email, _id: userId });

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
    const userId = req.user?.id
    
  } catch (error) {}
};
