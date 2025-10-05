"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cookieOpts = void 0;
const cookieOpts = (maxAge) => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge,
});
exports.cookieOpts = cookieOpts;
