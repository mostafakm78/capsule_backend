import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import multer, { FileFilterCallback } from 'multer';
import csurf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './types/types';
import authRouter from './routes/auth';
import cookieParser from 'cookie-parser';
import { requireAdmin, requireAuth, userIsBanned } from './middleware/is-auth';
import meRouter from './routes/me';
import adminRouter from './routes/admin';
import capsuleRoute from './routes/capsule';
import { CategoryGroup } from './models/Category';
import { seedCategories } from './models/seedCategories';
import path from 'path';
import fs from 'fs';
import { IMAGES_ROOT } from './helper/fileCleanup';
import publicRouter from './routes/public';

dotenv.config();

const app = express();

// Allowed CORS origins (adjust for prod)
const ALLOWED: string[] = ['http://localhost:3000'];

// Multer storage: route-based subfolders under IMAGES_ROOT
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const route = (req.baseUrl || req.path || req.originalUrl || '').toLowerCase();
    let subdir = 'others';
    if (route.includes('/me')) subdir = 'avatar';
    else if (route.includes('/capsules')) subdir = 'capsules';

    const dir = path.join(IMAGES_ROOT, subdir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const shortName = base.slice(0, 32).replace(/[^\w.-]/g, '_');
    cb(null, `${Date.now()}-${shortName}${ext}`);
  },
});

// Accept only PNG/JPG images
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (/^image\/(png|jpe?g)$/i.test(file.mimetype)) cb(null, true);
  else cb(null, false);
};

// Single-file upload middleware (field: 'image')
export const upload = multer({ storage, fileFilter }).single('image');

// Core middlewares
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(upload);

// CORS (credentials enabled)
app.use(
  cors({
    origin: ALLOWED,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-XSRF-TOKEN'],
  })
);

// CSRF protection (cookie-based tokens)
app.use(csurf({ cookie: { httpOnly: true, sameSite: 'lax', secure: false } }));
app.use((req, res, next) => {
  try {
    const token = req.csrfToken();
    res.cookie('X-XSRF-TOKEN', token, { httpOnly: false, sameSite: 'lax', secure: false, path: '/' });
  } catch {}
  next();
});

// Helper endpoint to read CSRF token
app.get('/csrf-token', (req: Request, res: Response) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Static images
app.use('/images', express.static(IMAGES_ROOT));

// Routes
app.use('/', publicRouter);
app.use('/auth', authRouter, userIsBanned); // auth routes + ban check
app.use('/me', requireAuth, userIsBanned, meRouter); // protected
app.use('/capsules', requireAuth, userIsBanned, capsuleRoute); // protected
app.use('/admin', requireAuth, requireAdmin, adminRouter); // admin-only

// CSRF error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'Invalid CSRF token', err });
  }
  return next(err);
});

// 404 handler for unknown routes
app.use((req: Request, res: Response, next: NextFunction) => {
  next({ message: `Route ${req.method} ${req.originalUrl} not found`, statusCode: 404 } as AppError);
});

// Central error handler
app.use((error: AppError, req: Request, res: Response, next: NextFunction) => {
  const status: number = error.statusCode ?? 500;
  const message: string = error.message || 'Internal Server Error';
  const data = error.data;
  res.status(status).json({ message, data });
});

// Seed categories on first connect
mongoose.connection.once('open', async () => {
  const count = await CategoryGroup.countDocuments();
  if (count === 0) {
    await seedCategories();
    console.log('✅ Categories seeded');
  }
});

// App bootstrap (DB + HTTP)
const start = async (): Promise<void> => {
  try {
    await mongoose.connect('mongodb://localhost:27017/capsule');
    console.log('Database connected');

    app.listen(8080, () => {
      console.log('Server is running on port 8080');
    });
  } catch (error) {
    console.log('Database connection failed =>', error);
  }
};

// Global process guards
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

start();
