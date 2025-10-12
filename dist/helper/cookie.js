"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cookieOpts = void 0;
const cookieOpts = (maxAge) => ({
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    domain: '.capsule-memo.ir',
    path: '/',
    maxAge,
});
exports.cookieOpts = cookieOpts;
