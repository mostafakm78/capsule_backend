import { Document, Schema } from 'mongoose';

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
  otpRequestTime: Date;
  isOTPValid: () => boolean;
}

export interface IContactUs extends Document {
  firstName: string;
  lastName: string;
  email: string;
  number: string;
  title: string;
  description: string;
}

export interface ICategoryGroup extends Document {
  key: string;
  title: string;
  order: number;
  isActive: boolean;
}

export interface ICategoryItem extends Document {
  group: Schema;
  key: string;
  title: string;
  order: number;
  isActive: boolean;
}

export interface INotification extends Document {
  title: string;
  users: Schema;
  text: string;
  type: 'message' | 'alert' | 'news' | 'system';
}

export interface ICapsuleAccess extends Document {
  visibility: 'public' | 'private';
  lock: 'none' | 'timed';
  unlockAt: Date;
}

export interface ICapsule extends Document {
  title: string;
  image?: string;
  description: string;
  extra?: string;
  color?: string;
  categoryItem: Schema;
  owner: Schema;
  access: ICapsuleAccess;
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
