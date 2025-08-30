import User from '../models/User';
import { AppError, Singup } from '../types/todo';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { cookieOpts } from '../helper/cookie';
import nodemailer from 'nodemailer';

const hashRt = (rt: string) => crypto.createHash('sha256').update(rt).digest('hex');

const generateOTP = (length: number = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

const sendOTP = async (email: string, otp: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'mostafamf555@gmail.com',
      pass: 'aeqy ocnx rfht jepm',
    },
  });

  const mailOptions = {
    from: 'mostafamf555@gmail.com',
    to: email,
    subject: 'کد یکبار مصرف سایت کپسول',
    html: `
      <html lang="fa" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>سایت کپسول</title>
  </head>
  <body
    style="display: flex; direction: rtl; flex-direction: column; width: 100%; min-height: 100vh; padding: 25px; justify-content: center; align-items: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; background-color: #f4f4f9;"
  >
    <div
      style="padding: 20px; border-radius: 10px; border: 1px solid #ddd; background-color: white; width: 100%; max-width: 600px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);"
    >
      <h2 style="color: #65647c; text-align: center;">رمز عبور یکبار مصرف شما</h2>
      <strong style="color: #65647c; display: inline-block; width: 120px;">زمان مصرف :</strong>
      <p
        style="color: #f7a5a5; border-top: 1px solid #ddd; padding: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 16px;"
      >کد عبور شما پس از ٣ دقیقه منقضی خواهد شد</p>
      <strong style="color: #65647c; display: inline-block; width: 120px;">کد عبور:</strong>
      <p
        style="color: #f7a5a5; border-top: 1px solid #ddd; padding: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 32px;"
      >${otp}</p>
    </div>
  </body>
</html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

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

    const user = await User.findOne({ email }).select('+password');
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

    res.cookie('accessToken', accessToken, cookieOpts(15 * 60 * 1000));

    res.cookie('refreshToken', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));

    res.json({ message: 'Login successful' });
  } catch (error) {
    return next({
      message: 'Login failed',
      statusCode: 500,
      data: error,
    } as AppError);
  }
};

export const loginWithOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next({
        message: 'email is required',
        statusCode: 400,
      } as AppError);
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next({
        message: 'cant find user with this email',
        statusCode: 401,
      } as AppError);
    }

    if (user.otpRequestTime) {
      const lastRequestTime = user.otpRequestTime;
      const now = new Date();
      const diffInMinutes = (now.getTime() - lastRequestTime.getTime()) / 1000 / 60;

      if (diffInMinutes < 1) {
        const newOtpRequestTime = new Date(lastRequestTime.getTime());
        newOtpRequestTime.setMinutes(lastRequestTime.getMinutes() + 1);
        user.otpRequestTime = newOtpRequestTime;
        const remainingTime = Math.ceil((newOtpRequestTime.getTime() - now.getTime()) / 1000 / 60);
        await user.save();
        if (remainingTime > 5) {
          return next({
            message: 'try later for send code',
            statusCode: 401,
          });
        }
        return next({
          message: `Please wait for ${remainingTime} minute before requesting OTP again`,
          statusCode: 400,
        } as AppError);
      }
    }

    const otp = generateOTP();
    const otpExpiration = new Date();
    otpExpiration.setMinutes(otpExpiration.getMinutes() + 3);

    user.OTP = otp;
    user.otpExpiration = otpExpiration;
    user.otpRequestTime = new Date();
    await user.save();

    await sendOTP(email, otp);

    res.status(200).json({
      message: 'otp code send to your email',
    });
  } catch (error: any) {
    return next({
      statusCode: 500,
      data: error.message,
    } as AppError);
  }
};

export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next({
        message: 'cant be find user with this email',
        statusCode: 401,
      } as AppError);
    }

    if (user.OTP !== otp) {
      return next({
        message: 'otp code is not correct',
        statusCode: 401,
      } as AppError);
    }

    if (!user.isOTPValid()) {
      user.OTP = '';
      user.otpExpiration = null;
      await user.save();

      return next({
        message: 'otp code expired',
        statusCode: 400,
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

    user.OTP = '';
    user.refreshToken = hashRt(refreshToken);
    await user.save();

    res.cookie('accessToken', accessToken, cookieOpts(15 * 60 * 1000));

    res.cookie('refreshToken', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));

    res.json({ message: 'Login successful' });
  } catch (error: any) {
    next({
      statusCode: 500,
      data: error.message,
    } as AppError);
  }
};

// export const refresh = async (req: Request, res: Response, next: NextFunction) => {
//   const refreshToken = req.cookies.refreshToken;
//   if (!refreshToken) return next({ message: 'Refresh token required', statusCode: 401 } as AppError);

//   try {
//     const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as { id: string };
//     const user = await User.findById(payload.id).select('+refreshToken');
//     if (!user || !user.refreshToken || user.refreshToken !== hashRt(refreshToken)) {
//       return next({ statusCode: 403, message: 'Invalid refresh token' } as AppError);
//     }

//     const newAccessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '15m' });

//     const newRefreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '7d' });

//     user.refreshToken = hashRt(newRefreshToken);
//     await user.save();

//     res.cookie('accessToken', newAccessToken, {
//       httpOnly: true,
//       sameSite: 'none',
//       secure: false,
//       path: '/',
//       maxAge: 15 * 60 * 1000,
//     });

//     res.cookie('refreshToken', newRefreshToken, {
//       httpOnly: true,
//       sameSite: 'none',
//       secure: false,
//       path: '/',
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     res.json({ message: 'Token refreshed' });
//   } catch (error) {
//     return next({ statusCode: 403, message: 'Invalid refresh token' } as AppError);
//   }
// };

export const logout = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  const rt = req.cookies.refreshToken as string | undefined;
  const secret = process.env.JWT_REFRESH_SECRET as string | undefined;
  if (rt && secret) {
    try {
      const { id } = jwt.verify(rt, secret) as { id: string };
      await User.findByIdAndUpdate(id, { $unset: { refreshToken: 1 } });
    } catch (error) {}
  }
  res.clearCookie('accessToken', cookieOpts(0));
  res.clearCookie('refreshToken', cookieOpts(0));
  res.json({ message: 'Logged out' });
};
