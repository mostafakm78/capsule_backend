import type { CookieOptions } from 'express';

export const cookieOpts = (maxAge: number): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  path: '/',
  maxAge,
});
