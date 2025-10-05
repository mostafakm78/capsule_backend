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
exports.refreshAccessToken = exports.logout = exports.verifyOTP = exports.loginWithOTP = exports.login = exports.signup = exports.getEmail = void 0;
const User_1 = __importDefault(require("../models/User"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const cookie_1 = require("../helper/cookie");
const nodemailer_1 = __importDefault(require("nodemailer"));
const express_validator_1 = require("express-validator");
/* ---------- Utils ---------- */
// Hash refresh token (SHA-256)
const hashRt = (rt) => crypto_1.default.createHash('sha256').update(rt).digest('hex');
// Generate numeric OTP of given length
const generateOTP = (length = 6) => {
    let otp = '';
    for (let i = 0; i < length; i++)
        otp += Math.floor(Math.random() * 10);
    return otp;
};
// Send OTP via Gmail SMTP (use ENV in production)
const sendOTP = (email, otp) => __awaiter(void 0, void 0, void 0, function* () {
    const transporter = nodemailer_1.default.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // STARTTLS
        auth: {
            user: 'mostafamf555@gmail.com', // TODO: move to ENV
            pass: 'aeqy ocnx rfht jepm', // TODO: move to ENV
        },
    });
    const mailOptions = {
        from: 'mostafamf555@gmail.com',
        to: email,
        subject: 'کد یکبار مصرف سایت کپسول',
        html: `
      <html lang="fa" dir="rtl">
        <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>سایت کپسول</title></head>
        <body style="display:flex;direction:rtl;flex-direction:column;width:100%;min-height:100vh;padding:25px;justify-content:center;align-items:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;background-color:#f4f4f9;">
          <div style="padding:20px;border-radius:10px;border:1px solid #ddd;background-color:#fff;width:100%;max-width:600px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color:#65647c;text-align:center;">رمز عبور یکبار مصرف شما</h2>
            <strong style="color:#65647c;display:inline-block;width:120px;">زمان مصرف :</strong>
            <p style="color:#f7a5a5;border-top:1px solid #ddd;padding:10px;display:flex;justify-content:space-between;align-items:center;font-size:16px;">کد عبور شما پس از ٣ دقیقه منقضی خواهد شد</p>
            <strong style="color:#65647c;display:inline-block;width:120px;">کد عبور:</strong>
            <p style="color:#f7a5a5;border-top:1px solid #ddd;padding:10px;display:flex;justify-content:space-between;align-items:center;font-size:32px;">${otp}</p>
          </div>
        </body>
      </html>
    `,
    };
    yield transporter.sendMail(mailOptions);
});
/* ---------- Controllers ---------- */
// check email
const getEmail = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    function isFieldError(e) {
        return e.type === 'field';
    }
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const data = errors
            .array()
            .filter(isFieldError)
            .map((e) => ({
            field: e.path,
            message: e.msg,
        }));
        return next({
            message: 'Singup Validation failed',
            statusCode: 422,
            data: data,
        });
    }
    try {
        const email = req.body.email;
        if (!email)
            return next({ message: 'Email not Found', statusCode: 404 });
        const UserFound = yield User_1.default.findOne({ email });
        if (!UserFound)
            return res.json({ message: 'notFound' });
        return res.json({ message: 'Found' });
    }
    catch (error) {
        return next({
            message: 'Failed to find user with email',
            statusCode: 500,
            data: error,
        });
    }
});
exports.getEmail = getEmail;
// Signup: email + password
const signup = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    function isFieldError(e) {
        return e.type === 'field';
    }
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const data = errors
            .array()
            .filter(isFieldError)
            .map((e) => ({
            field: e.path,
            message: e.msg,
        }));
        return next({
            message: 'Singup Validation failed',
            statusCode: 422,
            data: data,
        });
    }
    try {
        const { email, password } = req.body;
        // Validate required fields
        if (!email || !password) {
            return next({
                message: 'Email and password are required',
                statusCode: 400,
                data: { email: !!email, password: !!password },
            });
        }
        // Check existence
        const existingUser = yield User_1.default.findOne({ email });
        if (existingUser) {
            return next({
                message: 'Email already exists',
                statusCode: 409,
            });
        }
        // Hash password
        const hashPassword = yield bcryptjs_1.default.hash(password, 12);
        // Create user
        const newUser = yield User_1.default.create({ password: hashPassword, email });
        res.status(201).json({ message: 'User created successfully', status: 201, newUser });
    }
    catch (error) {
        // Server error
        return next({
            message: 'Failed to create user',
            statusCode: 500,
            data: error,
        });
    }
});
exports.signup = signup;
// Login: email + password -> set cookies
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    function isFieldError(e) {
        return e.type === 'field';
    }
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const data = errors
            .array()
            .filter(isFieldError)
            .map((e) => ({
            field: e.path,
            message: e.msg,
        }));
        return next({
            message: 'Singup Validation failed',
            statusCode: 422,
            data: data,
        });
    }
    try {
        const { email, password } = req.body;
        // Find user (+password)
        const user = yield User_1.default.findOne({ email }).select('+password');
        if (!user) {
            return next({
                message: 'Invalid credentials',
                statusCode: 401,
            });
        }
        // Compare password
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return next({
                message: 'Invalid credentials',
                statusCode: 401,
            });
        }
        // Access token (short-lived)
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
        // Refresh token (long-lived)
        const refreshToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        // Store hashed RT
        user.refreshToken = hashRt(refreshToken);
        yield user.save();
        // Set cookies
        res.cookie('accessToken', accessToken, (0, cookie_1.cookieOpts)(15 * 60 * 1000));
        res.cookie('refreshToken', refreshToken, (0, cookie_1.cookieOpts)(7 * 24 * 60 * 60 * 1000));
        res.json({ message: 'Login successful', status: 200 });
    }
    catch (error) {
        return next({
            message: 'Login failed',
            statusCode: 500,
            data: error,
        });
    }
});
exports.login = login;
// Request OTP by email (passwordless)
const loginWithOTP = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    function isFieldError(e) {
        return e.type === 'field';
    }
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const data = errors
            .array()
            .filter(isFieldError)
            .map((e) => ({
            field: e.path,
            message: e.msg,
        }));
        return next({
            message: 'Singup Validation failed',
            statusCode: 422,
            data: data,
        });
    }
    try {
        const { email } = req.body;
        // Validate email
        if (!email) {
            return next({
                message: 'Email is required',
                statusCode: 400,
            });
        }
        // Find user
        const user = yield User_1.default.findOne({ email }).select('+otpRequestTime +OTP +otpExpiration');
        if (!user) {
            return next({
                message: 'User not found',
                statusCode: 404,
            });
        }
        // Simple rate-limit: min 1 minute between requests
        if (user.otpRequestTime) {
            const lastRequestTime = user.otpRequestTime;
            const now = new Date();
            const diffInMinutes = (now.getTime() - lastRequestTime.getTime()) / 1000 / 60;
            if (diffInMinutes < 1) {
                const newOtpRequestTime = new Date(lastRequestTime.getTime());
                newOtpRequestTime.setMinutes(lastRequestTime.getMinutes() + 1);
                user.otpRequestTime = newOtpRequestTime;
                const remainingTime = Math.ceil((newOtpRequestTime.getTime() - now.getTime()) / 1000 / 60);
                yield user.save();
                // Guard (rare): if something went wrong with time calc
                if (remainingTime > 5) {
                    return next({
                        message: 'Too many OTP requests',
                        statusCode: 429,
                    });
                }
                // Inform client to wait
                return next({
                    message: `Please wait ${remainingTime} minute(s) before requesting another OTP`,
                    statusCode: 429,
                });
            }
        }
        // Generate & set 6-digit OTP with 3 min expiry
        const otp = generateOTP();
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);
        otpExpiration.setMinutes(otpExpiration.getMinutes() + 3);
        user.OTP = otp;
        user.otpExpiration = otpExpiration;
        user.otpRequestTime = new Date();
        yield user.save();
        // Send OTP
        yield sendOTP(email, otp);
        res.status(200).json({ message: 'OTP sent to your email', status: 200 });
    }
    catch (error) {
        return next({
            message: 'Failed to send OTP',
            statusCode: 500,
            data: error.message,
        });
    }
});
exports.loginWithOTP = loginWithOTP;
// Verify OTP and issue tokens
const verifyOTP = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    function isFieldError(e) {
        return e.type === 'field';
    }
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const data = errors
            .array()
            .filter(isFieldError)
            .map((e) => ({
            field: e.path,
            message: e.msg,
        }));
        return next({
            message: 'Singup Validation failed',
            statusCode: 422,
            data: data,
        });
    }
    try {
        const { email, otp } = req.body;
        // Find user (+OTP fields)
        const user = yield User_1.default.findOne({ email }).select('+OTP +otpExpiration +otpRequestTime');
        if (!user) {
            return next({
                message: 'User not found',
                statusCode: 404,
            });
        }
        // Check OTP match
        if (user.OTP !== otp) {
            return next({
                message: 'Invalid OTP code',
                statusCode: 401,
            });
        }
        // Check OTP validity (model method assumed)
        if (!user.isOTPValid()) {
            user.OTP = '';
            user.otpExpiration = null;
            yield user.save();
            return next({
                message: 'OTP code expired',
                statusCode: 401,
            });
        }
        // Access token
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
        // Refresh token
        const refreshToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        // Cleanup OTP + store hashed RT
        user.OTP = '';
        user.refreshToken = hashRt(refreshToken);
        yield user.save();
        // Set cookies
        res.cookie('accessToken', accessToken, (0, cookie_1.cookieOpts)(15 * 60 * 1000));
        res.cookie('refreshToken', refreshToken, (0, cookie_1.cookieOpts)(7 * 24 * 60 * 60 * 1000));
        res.json({ message: 'Login successful', status: 200 });
    }
    catch (error) {
        next({
            message: 'OTP verification failed',
            statusCode: 500,
            data: error.message,
        });
    }
});
exports.verifyOTP = verifyOTP;
// Logout: clear cookies and unset DB refreshToken
const logout = (req, res, _next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const rt = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.refreshToken;
    const secret = process.env.JWT_REFRESH_SECRET;
    if (rt && secret) {
        try {
            // Decode RT and remove stored hash
            const { id } = jsonwebtoken_1.default.verify(rt, secret);
            yield User_1.default.findByIdAndUpdate(id, { $unset: { refreshToken: 1 } });
        }
        catch (_error) {
            // Swallow errors silently (logout should continue)
        }
    }
    // Clear cookies
    res.clearCookie('accessToken', (0, cookie_1.cookieOpts)(0));
    res.clearCookie('refreshToken', (0, cookie_1.cookieOpts)(0));
    res.json({ message: 'Logged out', status: 200 });
});
exports.logout = logout;
const refreshAccessToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const refresh = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.refreshToken;
        const JWT_SECRET = process.env.JWT_SECRET;
        const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
        if (!refresh || !JWT_SECRET || !JWT_REFRESH_SECRET) {
            return next({ message: 'Authentication required', statusCode: 401 });
        }
        const payload = jsonwebtoken_1.default.verify(refresh, JWT_REFRESH_SECRET);
        const user = yield User_1.default.findById(payload.id).select('+refreshToken');
        if (!user || !user.refreshToken || user.refreshToken !== hashRt(refresh)) {
            return next({ message: 'Invalid refresh token', statusCode: 403 });
        }
        const newAccess = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
        res.cookie('accessToken', newAccess, (0, cookie_1.cookieOpts)(15 * 60 * 1000));
        return res.status(200).json({ message: 'Access token refreshed', accessToken: newAccess });
    }
    catch (err) {
        return next({ message: 'Could not refresh access token', statusCode: 401, data: err === null || err === void 0 ? void 0 : err.message });
    }
});
exports.refreshAccessToken = refreshAccessToken;
