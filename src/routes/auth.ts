import { Router } from 'express';
import { signup, login, logout, loginWithOTP, verifyOTP } from '../controllers/auth';

const authRouter = Router();

authRouter.post('/signup', signup);
authRouter.post('/login', login);
authRouter.post('/otp/send', loginWithOTP);
authRouter.post('/otp/verify', verifyOTP);
// authRouter.post('/refresh' , refresh)
authRouter.post('/logout', logout);

export default authRouter;
