export interface AppError extends Error {
  statusCode?: number;
  data?: any;
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
    firstName : string
    lastName : string
    email : string
    number : string
    title : string
    description : string
}
