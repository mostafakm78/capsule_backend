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
exports.upload = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const csurf_1 = __importDefault(require("csurf"));
const auth_1 = __importDefault(require("./routes/auth"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const is_auth_1 = require("./middleware/is-auth");
const me_1 = __importDefault(require("./routes/me"));
const admin_1 = __importDefault(require("./routes/admin"));
const capsule_1 = __importDefault(require("./routes/capsule"));
const Category_1 = require("./models/Category");
const seedCategories_1 = require("./models/seedCategories");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fileCleanup_1 = require("./helper/fileCleanup");
const public_1 = __importDefault(require("./routes/public"));
dotenv_1.default.config();
const app = (0, express_1.default)();
/** اگر پشت Cloudflare/پروکسی هستی برای Secure cookie ضروریه */
app.set('trust proxy', 1);
/** دامنه‌های مجاز تولید + لوکال */
const ALLOWED = ['https://capsule-memo.ir', 'https://www.capsule-memo.ir', 'http://localhost:3000'];
/** CORS با کوکی */
app.use((0, cors_1.default)({
    origin(origin, cb) {
        if (!origin)
            return cb(null, true);
        return cb(null, ALLOWED.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN'],
}));
// Multer storage: route-based subfolders under IMAGES_ROOT
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const pathname = (req.originalUrl || req.url || '').split('?')[0].toLowerCase();
        let subdir = null;
        if (/^\/me(\/|$)/.test(pathname)) {
            subdir = 'avatar';
        }
        else if (/^\/admin\/users\/[^/]+\/[^/]+(\/|$)/.test(pathname)) {
            subdir = 'capsules';
        }
        else if (/^\/capsules(\/|$)/.test(pathname)) {
            subdir = 'capsules';
        }
        if (!subdir) {
            return cb(new Error('Upload not allowed for this route'), '');
        }
        const dir = path_1.default.join(fileCleanup_1.IMAGES_ROOT, subdir);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const base = path_1.default.basename(file.originalname, ext);
        const shortName = base.slice(0, 32).replace(/[^\w.-]/g, '_');
        cb(null, `${Date.now()}-${shortName}${ext}`);
    },
});
// Accept only PNG/JPG images
const fileFilter = (req, file, cb) => {
    const mt = (file.mimetype || '').toLowerCase();
    const okByMime = mt === 'image/png' || mt === 'image/jpeg' || mt === 'image/jpg' || mt === 'image/pjpeg' || mt === 'image/x-png';
    const okByExt = /\.(png|jpe?g)$/i.test(file.originalname || '');
    if (okByMime || okByExt)
        return cb(null, true);
    const err = new Error('فرمت فایل مجاز نیست. فقط PNG یا JPG مجاز است');
    err.code = 'INVALID_FILE_TYPE';
    err.statusCode = 415;
    return cb(err);
};
// Single-file upload middleware (field: 'image')
exports.upload = (0, multer_1.default)({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }).single('image');
// Core middlewares
app.use((0, cookie_parser_1.default)());
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(exports.upload);
// CSRF protection (cookie-based tokens)
app.use((0, csurf_1.default)({ cookie: { httpOnly: true, sameSite: 'none', secure: true, domain: '.capsule-memo.ir' } }));
app.get('/csrf-token', (req, res) => {
    const token = req.csrfToken();
    res.cookie('XSRF-TOKEN', token, { sameSite: 'none', httpOnly: false, secure: true, domain: '.capsule-memo.ir', path: '/' });
    res.json({ csrfToken: token });
});
// Static images
app.use('/images', express_1.default.static(fileCleanup_1.IMAGES_ROOT));
// Routes
app.use('/auth', auth_1.default, is_auth_1.userIsBanned); // auth routes + ban check
app.use('/me', is_auth_1.requireAuth, is_auth_1.userIsBanned, me_1.default); // protected
app.use('/capsules', is_auth_1.requireAuth, is_auth_1.userIsBanned, capsule_1.default); // protected
app.use('/public', public_1.default);
app.use('/admin', is_auth_1.requireAuth, is_auth_1.requireAdmin, admin_1.default); // admin-only
// CSRF error handler
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    return next(err);
});
// 404 handler for unknown routes
app.use((req, res, next) => {
    next({ message: `Route ${req.method} ${req.originalUrl} not found`, statusCode: 404 });
});
// Central error handler
app.use((error, req, res, next) => {
    var _a;
    const status = (_a = error.statusCode) !== null && _a !== void 0 ? _a : 500;
    const message = error.message || 'Internal Server Error';
    const data = error.data;
    res.status(status).json({ message, status: status, data });
});
// Seed categories on first connect
mongoose_1.default.connection.once('open', () => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield Category_1.CategoryGroup.countDocuments();
    if (count === 0) {
        yield (0, seedCategories_1.seedCategories)();
        console.log('✅ Categories seeded');
    }
}));
const MONGO_URI = process.env.MONGO_URI;
// App bootstrap (DB + HTTP)
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!MONGO_URI) {
            throw new Error('MONGO_URI environment variable is not defined');
        }
        yield mongoose_1.default.connect(MONGO_URI);
        console.log('Database connected');
        app.listen(8080, () => {
            console.log('Server is running on port 8080');
        });
    }
    catch (error) {
        console.log('Database connection failed =>', error);
    }
});
// Global process guards
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
start();
