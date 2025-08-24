import { NextFunction, Request, Response } from 'express';
import { AppError, Singup } from '../types/todo';
import User from '../models/User';

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    res.status(200).json({ message: 'user Found', user });
  } catch (error) {
    next({
      message: 'cant find user!',
      data: error,
      statusCode: 500,
    } as AppError);
  }
};
