import { ValidationChain } from 'express-validator';
import { Document, Schema } from 'mongoose';

export interface AppError extends Error {
  statusCode?: number;
  data?: any | ValidationChain[];
}

export interface IViolationMeta {
  lockUntil: Date | null;
  strikes: number;
  lastSetAt: Date | null;
}

export interface IModeration {
  violation: IViolationMeta;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  isBanned: boolean;
  flag: 'none' | 'sus' | 'review' | 'violation';
  moderation: IModeration;
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
  title: string;
}

export interface ICategoryItem extends Document {
  group: Schema;
  title: string;
}

export interface INotification extends Document {
  title: string;
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
