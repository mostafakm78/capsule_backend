import User from '../models/User';
import { AppError, Singup } from '../types/todo';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const signup = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const hashPassword = await bcrypt.hash(password, 12);

    if (!email || !password) {
      return next({
        message: 'Email and Password required',
        statusCode: 400,
        data: { email, password },
      } as AppError);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      next({
        message: 'Email already exist',
        statusCode: 401,
      } as AppError);
    }

    const newUser = await User.create({ password: hashPassword, email });
    res.status(201).json({ message: 'User Created Successfully!', newUser });
  } catch (error: any) {
    next({
      statusCode: 500,
      data: error,
    } as AppError);
  }
};

export const login = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next({
        message: 'Invalid User',
        statusCode: 401,
      } as AppError);
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      return next({
        message: 'Invalid User',
        statusCode: 401,
      } as AppError);
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ message: 'Login successful' });
  } catch (error) {
    return next({
      message: 'Login failed',
      statusCode: 500,
      data: error,
    } as AppError);
  }
};

export const logout = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false,
    sameSite: 'none',
    path: '/',
  });
  res.json({ message: 'Logged out' });
};
