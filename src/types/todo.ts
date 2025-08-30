import { Document } from 'mongoose';

export interface AppError extends Error {
  statusCode?: number;
  data?: any;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  isBanned: boolean;
  flag: 'none' | 'sus' | 'review' | 'violation';
  about?: string;
  refreshToken?: string;
  OTP: string;
  otpExpiration: Date | null;
  birthday?: string;
  education?: string;
  avatar?: string;
  otpRequestTime : Date
  isOTPValid: () => boolean;
}

export type Singup = {
  email: string;
  password: string;
};

export type AuthRequest = {
  user?: {
    id: string;
    role: 'admin' | 'user';
    email?: string;
  };
};

export type Role = 'admin' | 'user';

export type Flag = 'none' | 'sus' | 'violation' | 'review';

export type NotificationTypes = 'system' | 'news' | 'alert' | 'message';

export type FormRequest = {
  firstName: string;
  lastName: string;
  email: string;
  number: string;
  title: string;
  description: string;
};
