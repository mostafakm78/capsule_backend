import User from '../models/User';
import { AppError, Singup } from '../types/todo';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const hashRt = (rt: string) => crypto.createHash('sha256').update(rt).digest('hex');

export const signup = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next({
        message: 'Email and Password required',
        statusCode: 400,
        data: { email: !!email, password: !!password },
      } as AppError);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next({
        message: 'Email already exist',
        statusCode: 409,
      } as AppError);
    }

    const hashPassword = await bcrypt.hash(password, 12);

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

    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: '7d' }
    );

    user.refreshToken = hashRt(refreshToken);
    await user.save();

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return next({ message: 'Refresh token required', statusCode: 401 } as AppError);

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as { id: string };
    const user = await User.findById(payload.id).select('+refreshToken');
    if (!user || !user.refreshToken || user.refreshToken !== hashRt(refreshToken)) {
      return next({ statusCode: 403, message: 'Invalid refresh token' } as AppError);
    }

    const newAccessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '15m' });

    const newRefreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '7d' });

    user.refreshToken = hashRt(newRefreshToken);
    await user.save();

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: false,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: 'Token refreshed' });
  } catch (error) {
    return next({ statusCode: 403, message: 'Invalid refresh token' } as AppError);
  }
};

export const logout = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  const rt = req.cookies.refreshToken as string | undefined;
  const secret = process.env.JWT_REFRESH_SECRET as string | undefined;
  if (rt && secret) {
    try {
      const { id } = jwt.verify(rt, secret) as { id: string };
      await User.findByIdAndUpdate(id, { $unset: { refreshToken: 1 } });
    } catch (error) {}
  }
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: false,
    sameSite: 'none',
    path: '/',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: false,
    sameSite: 'none',
    path: '/',
  });
  res.json({ message: 'Logged out' });
};
