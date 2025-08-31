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
import { requireAdmin, requireAuth } from './middleware/is-auth';
import meRouter from './routes/me';
import adminRouter from './routes/admin';
import capsuleRoute from './routes/capsule';
import { CategoryGroup } from './models/Category';
import { seedCategories } from './models/seedCategories';
import path from 'path';
import fs from 'fs';
import contactUsRouter from './routes/contactus';
import { IMAGES_ROOT } from './helper/fileCleanup';

dotenv.config();

const app = express();

const ALLOWED = ['http://localhost:3000'];

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

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (/^image\/(png|jpe?g)$/i.test(file.mimetype)) cb(null, true);
  else cb(null, false);
};

export const upload = multer({ storage, fileFilter }).single('image');

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(upload);

app.use(
  cors({
    origin: ALLOWED,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-XSRF-TOKEN'],
  })
);

app.use(csurf({ cookie: { httpOnly: true, sameSite: 'lax', secure: false } }));
app.use((req, res, next) => {
  try {
    const token = req.csrfToken();
    res.cookie('X-XSRF-TOKEN', token, { httpOnly: false, sameSite: 'lax', secure: false, path: '/' });
  } catch {}
  next();
});

app.get('/csrf-token', (req: Request, res: Response) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use('/images', express.static(IMAGES_ROOT));

app.use('/contactus', contactUsRouter);
app.use('/auth', authRouter);
app.use('/me', requireAuth, meRouter);
app.use('/capsules', requireAuth, capsuleRoute);
app.use('/admin', requireAuth, requireAdmin, adminRouter);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'Invalid CSRF token', err });
  }
  return next(err);
});

app.use((req: Request, res: Response, next: NextFunction) => {
  next({ message: `Route ${req.method} ${req.originalUrl} not Found!`, statusCode: 404 } as AppError);
});

app.use((error: AppError, req: Request, res: Response, next: NextFunction) => {
  const status = error.statusCode ?? 500;
  const message = error.message || 'Internal Server Error';
  const data = error.data;
  res.status(status).json({ message, data });
});

mongoose.connection.once('open', async () => {
  const count = await CategoryGroup.countDocuments();
  if (count === 0) {
    await seedCategories();
    console.log('✅ Categories seeded');
  }
});

const start = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/capsule');
    console.log('Database is Connected!');

    app.listen(8080, () => {
      console.log('Server is running on port 8080');
    });
  } catch (error) {
    console.log('Database connection faild =>', error);
  }
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

start();
