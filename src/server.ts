import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

import { AppError } from './types/todo';
import authRouter from './routes/auth';
import cookieParser from 'cookie-parser';
import { requireAdmin, requireAuth } from './middleware/is-auth';
import meRouter from './routes/me';
import adminRouter from './routes/admin';

dotenv.config();

const app = express();

app.use(cookieParser());
app.use(bodyParser.json());

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  })
);

app.use('/auth', authRouter);
app.use('/me' , requireAuth , meRouter)
app.use('/admin' , requireAuth , requireAdmin , adminRouter)
// app.use('/users', userRouter);
// app.use('/capsules');

app.use((error: AppError, req: Request, res: Response, next: NextFunction) => {
  const status = error.statusCode ?? 500;
  const message = error.message || 'Internal Server Error';
  const data = error.data;
  res.status(status).json({ message, data });
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
