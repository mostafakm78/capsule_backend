import type { CookieOptions } from 'express';

export const cookieOpts = (maxAge: number): CookieOptions => ({
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  domain: '.capsule-memo.ir',
  path: '/',
  maxAge,
});
