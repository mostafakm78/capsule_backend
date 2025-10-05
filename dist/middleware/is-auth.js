"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userIsBanned = exports.requireAdmin = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
/* ───────────────────── Utils ───────────────────── */
// Hash refresh token (SHA-256) for DB storage
const hashRt = (rt) => crypto_1.default.createHash('sha256').update(rt).digest('hex');
/* ─────────────────── Middlewares ─────────────────── */
/** Auth guard: verify access token, fallback to refresh rotation */
const requireAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const access = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken;
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        return next({ message: 'Server JWT misconfigured', statusCode: 500 });
    }
    try {
        // Prefer access token
        if (!access)
            throw new Error('No access');
        const payload = jsonwebtoken_1.default.verify(access, JWT_SECRET);
        if (!(payload === null || payload === void 0 ? void 0 : payload.id) || (payload.role !== 'admin' && payload.role !== 'user')) {
            throw new Error('Bad access payload');
        }
        // Minimal user lookup to enforce ban in real-time
        const user = yield User_1.default.findById(payload.id).select('role isBanned');
        if (!user)
            return next({ message: 'User not found', statusCode: 404 });
        if (user.isBanned)
            return next({ message: 'User is banned', statusCode: 403 });
        req.user = { id: payload.id, role: payload.role };
        return next();
    }
    catch (error) {
        return next({ message: 'Unauthorized', statusCode: 401 });
    }
});
exports.requireAuth = requireAuth;
/** Role guard: admin only */
const requireAdmin = (req, _res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        return next({ message: 'Admin only', statusCode: 403 });
    }
    return next();
});
exports.requireAdmin = requireAdmin;
/** Ban guard: block banned users (lightweight DB check) */
const userIsBanned = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return next({ message: 'Authentication required', statusCode: 401 });
        }
        const user = yield User_1.default.findById(userId);
        if (!user) {
            return next({ message: 'User not found', statusCode: 404 });
        }
        if (user.isBanned) {
            return next({ message: 'User is banned', statusCode: 403 });
        }
        else {
            next();
        }
    }
    catch (error) {
        return next({
            message: 'Error in ban middleware',
            statusCode: 500,
            data: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.userIsBanned = userIsBanned;
