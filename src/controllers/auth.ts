import User from '../models/User';
import { AppError, Singup } from '../types/types';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { cookieOpts } from '../helper/cookie';
import nodemailer from 'nodemailer';
import { FieldValidationError, ValidationError, validationResult } from 'express-validator';
import { Types } from 'mongoose';

/* ---------- Utils ---------- */

// Hash refresh token (SHA-256)
const hashRt = (rt: string): string => crypto.createHash('sha256').update(rt).digest('hex');

// Generate numeric OTP of given length
const generateOTP = (length: number = 6): string => {
  let otp = '';
  for (let i = 0; i < length; i++) otp += Math.floor(Math.random() * 10);
  return otp;
};

// Send OTP via Gmail SMTP (use ENV in production)
const sendOTP = async (email: string, otp: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: 'mostafamf555@gmail.com', // TODO: move to ENV
      pass: 'aeqy ocnx rfht jepm', // TODO: move to ENV
    },
  });

  const mailOptions = {
    from: 'mostafamf555@gmail.com',
    to: email,
    subject: 'کد یکبار مصرف سایت کپسول',
    html: `
      <html lang="fa" dir="rtl">
        <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>سایت کپسول</title></head>
        <body style="display:flex;direction:rtl;flex-direction:column;width:100%;min-height:100vh;padding:25px;justify-content:center;align-items:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;background-color:#f4f4f9;">
          <div style="padding:20px;border-radius:10px;border:1px solid #ddd;background-color:#fff;width:100%;max-width:600px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color:#65647c;text-align:center;">رمز عبور یکبار مصرف شما</h2>
            <strong style="color:#65647c;display:inline-block;width:120px;">زمان مصرف :</strong>
            <p style="color:#f7a5a5;border-top:1px solid #ddd;padding:10px;display:flex;justify-content:space-between;align-items:center;font-size:16px;">کد عبور شما پس از ٣ دقیقه منقضی خواهد شد</p>
            <strong style="color:#65647c;display:inline-block;width:120px;">کد عبور:</strong>
            <p style="color:#f7a5a5;border-top:1px solid #ddd;padding:10px;display:flex;justify-content:space-between;align-items:center;font-size:32px;">${otp}</p>
          </div>
        </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/* ---------- Controllers ---------- */

// check email
export const getEmail = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  function isFieldError(e: ValidationError): e is FieldValidationError {
    return e.type === 'field';
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const data = errors
      .array()
      .filter(isFieldError)
      .map((e) => ({
        field: e.path,
        message: e.msg,
      }));
    return next({
      message: 'Singup Validation failed',
      statusCode: 422,
      data: data,
    } as AppError);
  }
  try {
    const email = req.body.email;

    if (!email) return next({ message: 'Email not Found', statusCode: 404 } as AppError);

    const UserFound = await User.findOne({ email });

    if (!UserFound) return res.json({ message: 'notFound' });

    return res.json({ message: 'Found' });
  } catch (error: any) {
    return next({
      message: 'Failed to find user with email',
      statusCode: 500,
      data: error,
    } as AppError);
  }
};

// Signup: email + password
export const signup = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  function isFieldError(e: ValidationError): e is FieldValidationError {
    return e.type === 'field';
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const data = errors
      .array()
      .filter(isFieldError)
      .map((e) => ({
        field: e.path,
        message: e.msg,
      }));
    return next({
      message: 'Singup Validation failed',
      statusCode: 422,
      data: data,
    } as AppError);
  }
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return next({
        message: 'Email and password are required',
        statusCode: 400,
        data: { email: !!email, password: !!password },
      } as AppError);
    }

    // Check existence
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next({
        message: 'Email already exists',
        statusCode: 409,
      } as AppError);
    }

    // Hash password
    const hashPassword: string = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await User.create({ password: hashPassword, email });
    res.status(201).json({ message: 'User created successfully', status: 201, newUser });
  } catch (error: any) {
    // Server error
    return next({
      message: 'Failed to create user',
      statusCode: 500,
      data: error,
    } as AppError);
  }
};

// Login: email + password -> set cookies
export const login = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  function isFieldError(e: ValidationError): e is FieldValidationError {
    return e.type === 'field';
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const data = errors
      .array()
      .filter(isFieldError)
      .map((e) => ({
        field: e.path,
        message: e.msg,
      }));
    return next({
      message: 'Singup Validation failed',
      statusCode: 422,
      data: data,
    } as AppError);
  }
  try {
    const { email, password } = req.body;

    // Find user (+password)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next({
        message: 'Invalid credentials',
        statusCode: 401,
      } as AppError);
    }

    // Compare password
    const isMatch: boolean = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      return next({
        message: 'Invalid credentials',
        statusCode: 401,
      } as AppError);
    }

    // Access token (short-lived)
    const accessToken: string = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '15m' });

    // Refresh token (long-lived)
    const refreshToken: string = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '7d' });

    // Store hashed RT
    user.refreshToken = hashRt(refreshToken);
    await user.save();

    // Set cookies
    res.cookie('accessToken', accessToken, cookieOpts(15 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));

    res.json({ message: 'Login successful', status: 200 });
  } catch (error: any) {
    return next({
      message: 'Login failed',
      statusCode: 500,
      data: error,
    } as AppError);
  }
};

// Request OTP by email (passwordless)
export const loginWithOTP = async (req: Request, res: Response, next: NextFunction) => {
  function isFieldError(e: ValidationError): e is FieldValidationError {
    return e.type === 'field';
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const data = errors
      .array()
      .filter(isFieldError)
      .map((e) => ({
        field: e.path,
        message: e.msg,
      }));
    return next({
      message: 'Singup Validation failed',
      statusCode: 422,
      data: data,
    } as AppError);
  }
  try {
    const { email } = req.body as { email?: string };

    // Validate email
    if (!email) {
      return next({
        message: 'Email is required',
        statusCode: 400,
      } as AppError);
    }

    // Find user
    const user = await User.findOne({ email }).select('+otpRequestTime +OTP +otpExpiration');
    if (!user) {
      return next({
        message: 'User not found',
        statusCode: 404,
      } as AppError);
    }

    // Simple rate-limit: min 1 minute between requests
    if (user.otpRequestTime) {
      const lastRequestTime: Date = user.otpRequestTime;
      const now: Date = new Date();
      const diffInMinutes: number = (now.getTime() - lastRequestTime.getTime()) / 1000 / 60;

      if (diffInMinutes < 1) {
        const newOtpRequestTime = new Date(lastRequestTime.getTime());
        newOtpRequestTime.setMinutes(lastRequestTime.getMinutes() + 1);
        user.otpRequestTime = newOtpRequestTime;
        const remainingTime = Math.ceil((newOtpRequestTime.getTime() - now.getTime()) / 1000 / 60);
        await user.save();

        // Guard (rare): if something went wrong with time calc
        if (remainingTime > 5) {
          return next({
            message: 'Too many OTP requests',
            statusCode: 429,
          } as AppError);
        }

        // Inform client to wait
        return next({
          message: `Please wait ${remainingTime} minute(s) before requesting another OTP`,
          statusCode: 429,
        } as AppError);
      }
    }

    // Generate & set 6-digit OTP with 3 min expiry
    const otp: string = generateOTP();
    const otpExpiration: Date = new Date(Date.now() + 5 * 60 * 1000);
    otpExpiration.setMinutes(otpExpiration.getMinutes() + 3);

    user.OTP = otp;
    user.otpExpiration = otpExpiration;
    user.otpRequestTime = new Date();
    await user.save();

    // Send OTP
    await sendOTP(email, otp);

    res.status(200).json({ message: 'OTP sent to your email', status: 200 });
  } catch (error: any) {
    return next({
      message: 'Failed to send OTP',
      statusCode: 500,
      data: error.message,
    } as AppError);
  }
};

// Verify OTP and issue tokens
export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  function isFieldError(e: ValidationError): e is FieldValidationError {
    return e.type === 'field';
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const data = errors
      .array()
      .filter(isFieldError)
      .map((e) => ({
        field: e.path,
        message: e.msg,
      }));
    return next({
      message: 'Singup Validation failed',
      statusCode: 422,
      data: data,
    } as AppError);
  }
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };

    // Find user (+OTP fields)
    const user = await User.findOne({ email }).select('+OTP +otpExpiration +otpRequestTime');
    if (!user) {
      return next({
        message: 'User not found',
        statusCode: 404,
      } as AppError);
    }

    // Check OTP match
    if (user.OTP !== otp) {
      return next({
        message: 'Invalid OTP code',
        statusCode: 401,
      } as AppError);
    }

    // Check OTP validity (model method assumed)
    if (!user.isOTPValid()) {
      user.OTP = '';
      user.otpExpiration = null;
      await user.save();

      return next({
        message: 'OTP code expired',
        statusCode: 401,
      } as AppError);
    }

    // Access token
    const accessToken: string = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '15m' });

    // Refresh token
    const refreshToken: string = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '7d' });

    // Cleanup OTP + store hashed RT
    user.OTP = '';
    user.refreshToken = hashRt(refreshToken);
    await user.save();

    // Set cookies
    res.cookie('accessToken', accessToken, cookieOpts(15 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));

    res.json({ message: 'Login successful', status: 200 });
  } catch (error: any) {
    next({
      message: 'OTP verification failed',
      statusCode: 500,
      data: error.message,
    } as AppError);
  }
};

// Logout: clear cookies and unset DB refreshToken
export const logout = async (req: Request<{}, {}, Singup>, res: Response, _next: NextFunction) => {
  const rt: string | undefined = req.cookies?.refreshToken as string | undefined;
  const secret: string | undefined = process.env.JWT_REFRESH_SECRET as string | undefined;

  if (rt && secret) {
    try {
      // Decode RT and remove stored hash
      const { id } = jwt.verify(rt, secret) as { id: string };
      await User.findByIdAndUpdate(id, { $unset: { refreshToken: 1 } });
    } catch (_error) {
      // Swallow errors silently (logout should continue)
    }
  }

  // Clear cookies
  res.clearCookie('accessToken', cookieOpts(0));
  res.clearCookie('refreshToken', cookieOpts(0));

  res.json({ message: 'Logged out', status: 200 });
};

export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refresh = req.cookies?.refreshToken;
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

    if (!refresh || !JWT_SECRET || !JWT_REFRESH_SECRET) {
      return next({ message: 'Authentication required', statusCode: 401 } as AppError);
    }

    const payload = jwt.verify(refresh, JWT_REFRESH_SECRET) as { id: string };

    const user = await User.findById(payload.id).select('+refreshToken');
    if (!user || !user.refreshToken || user.refreshToken !== hashRt(refresh)) {
      return next({ message: 'Invalid refresh token', statusCode: 403 } as AppError);
    }

    const newAccess = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });

    res.cookie('accessToken', newAccess, cookieOpts(15 * 60 * 1000));
    return res.status(200).json({ message: 'Access token refreshed', accessToken: newAccess });
  } catch (err: any) {
    return next({ message: 'Could not refresh access token', statusCode: 401, data: err?.message } as AppError);
  }
};
