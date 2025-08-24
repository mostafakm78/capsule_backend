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
