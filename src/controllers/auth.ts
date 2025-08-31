// Import the User model (likely a Mongoose model for users)
import User from '../models/User';

// Custom types for error handling and signup payload
import { AppError, Singup } from '../types/types';

// Express types for typing request handlers
import { Request, Response, NextFunction } from 'express';

// Password hashing and comparison
import bcrypt from 'bcryptjs';

// JWT creation and verification
import jwt from 'jsonwebtoken';

// Node crypto for hashing (used to hash refresh tokens)
import crypto from 'crypto';

// Helper to build cookie options (httpOnly, maxAge, sameSite, etc.)
import { cookieOpts } from '../helper/cookie';

// For sending emails (used to send OTP)
import nodemailer from 'nodemailer';

// Utility: hash a refresh token using SHA-256 for safe DB storage
const hashRt = (rt: string) => crypto.createHash('sha256').update(rt).digest('hex');

// Utility: generate a numeric OTP of specific length (default 6 digits)
const generateOTP = (length: number = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

// Send OTP to the user's email using Nodemailer (Gmail SMTP here)
// NOTE: For production you should move credentials to environment variables.
const sendOTP = async (email: string, otp: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS on port 587
    auth: {
      user: 'mostafamf555@gmail.com', // <-- consider using process.env for secrets
      pass: 'aeqy ocnx rfht jepm', // <-- app password; keep out of source code
    },
  });

  // Email content (RTL/Farsi HTML with the OTP embedded)
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

  // Actually send the email with OTP
  await transporter.sendMail(mailOptions);
};

// Controller: Signup with email + password
export const signup = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Basic validation for presence of email and password
    if (!email || !password) {
      return next({
        message: 'Email and Password required',
        statusCode: 400,
        data: { email: !!email, password: !!password },
      } as AppError);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next({
        message: 'Email already exist',
        statusCode: 409,
      } as AppError);
    }

    // Hash password with bcrypt (cost 12)
    const hashPassword = await bcrypt.hash(password, 12);

    // Create user in DB
    const newUser = await User.create({ password: hashPassword, email });
    res.status(201).json({ message: 'User Created Successfully!', newUser });
  } catch (error: any) {
    // Generic server error
    next({
      statusCode: 500,
      data: error,
    } as AppError);
  }
};

// Controller: Login with email + password, issue access/refresh tokens in cookies
export const login = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user and include password field explicitly
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next({
        message: 'Invalid User',
        statusCode: 401,
      } as AppError);
    }

    // Compare provided password with stored hash
    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      return next({
        message: 'Invalid User',
        statusCode: 401,
      } as AppError);
    }

    // Create short-lived access token
    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    // Create longer-lived refresh token
    const refreshToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: '7d' }
    );

    // Store hashed refresh token in DB for verification/rotation
    user.refreshToken = hashRt(refreshToken);
    await user.save();

    // Set access token cookie (httpOnly, options via cookieOpts)
    res.cookie('accessToken', accessToken, cookieOpts(15 * 60 * 1000));

    // Set refresh token cookie (httpOnly)
    res.cookie('refreshToken', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));

    res.json({ message: 'Login successful' });
  } catch (error) {
    // On unexpected error
    return next({
      message: 'Login failed',
      statusCode: 500,
      data: error,
    } as AppError);
  }
};

// Controller: Request an OTP to login with email (passwordless-ish flow)
export const loginWithOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    // Validate email presence
    if (!email) {
      return next({
        message: 'email is required',
        statusCode: 400,
      } as AppError);
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next({
        message: 'cant find user with this email',
        statusCode: 401,
      } as AppError);
    }

    // Rate limiting: ensure at least 1 minute between OTP requests
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
          // Safety guard (should not normally be > 5)
          return next({
            message: 'try later for send code',
            statusCode: 401,
          });
        }
        // Inform the client to wait before requesting another OTP
        return next({
          message: `Please wait for ${remainingTime} minute before requesting OTP again`,
          statusCode: 400,
        } as AppError);
      }
    }

    // Generate a 6-digit OTP and set expiration (3 minutes)
    const otp = generateOTP();
    const otpExpiration = new Date();
    otpExpiration.setMinutes(otpExpiration.getMinutes() + 3);

    // Save OTP and timestamps on the user
    user.OTP = otp;
    user.otpExpiration = otpExpiration;
    user.otpRequestTime = new Date();
    await user.save();

    // Send the OTP via email
    await sendOTP(email, otp);

    res.status(200).json({
      message: 'otp code send to your email',
    });
  } catch (error: any) {
    // Generic server error with message
    return next({
      statusCode: 500,
      data: error.message,
    } as AppError);
  }
};

// Controller: Verify the provided OTP and issue tokens if valid
export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+OTP +otpExpiration +otpRequestTime');
    if (!user) {
      return next({
        message: 'cant be find user with this email',
        statusCode: 401,
      } as AppError);
    }

    // Check if OTP matches
    if (user.OTP !== otp) {
      return next({
        message: 'otp code is not correct',
        statusCode: 401,
      } as AppError);
    }

    // Validate OTP expiration (assumes user.isOTPValid() exists on model)
    if (!user.isOTPValid()) {
      user.OTP = '';
      user.otpExpiration = null;
      await user.save();

      return next({
        message: 'otp code expired',
        statusCode: 400,
      } as AppError);
    }

    // Issue access token (short lived)
    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    // Issue refresh token (longer lived)
    const refreshToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: '7d' }
    );

    // Cleanup OTP and store hashed refresh token in DB
    user.OTP = '';
    user.refreshToken = hashRt(refreshToken);
    await user.save();

    // Set tokens in httpOnly cookies
    res.cookie('accessToken', accessToken, cookieOpts(15 * 60 * 1000));

    res.cookie('refreshToken', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));

    res.json({ message: 'Login successful' });
  } catch (error: any) {
    // Generic server error
    next({
      statusCode: 500,
      data: error.message,
    } as AppError);
  }
};

// Controller: Logout
// Clears cookies and attempts to remove the stored hashed refresh token for the user
export const logout = async (req: Request<{}, {}, Singup>, res: Response, next: NextFunction) => {
  const rt = req.cookies.refreshToken as string | undefined;
  const secret = process.env.JWT_REFRESH_SECRET as string | undefined;
  if (rt && secret) {
    try {
      // Decode the refresh token to get user id, then unset refreshToken hash in DB
      const { id } = jwt.verify(rt, secret) as { id: string };
      await User.findByIdAndUpdate(id, { $unset: { refreshToken: 1 } });
    } catch (error) {}
  }
  // Clear auth cookies immediately
  res.clearCookie('accessToken', cookieOpts(0));
  res.clearCookie('refreshToken', cookieOpts(0));
  res.json({ message: 'Logged out' });
};
