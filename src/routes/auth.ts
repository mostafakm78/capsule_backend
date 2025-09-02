import { Router } from 'express';
import { signup, login, logout, loginWithOTP, verifyOTP } from '../controllers/auth';

import { loginValidators, otpSendValidators, otpVerifyValidators, signupValidators } from '../validators/auth.validators';

const authRouter = Router();

authRouter.post('/signup', signupValidators, signup);
authRouter.post('/login', loginValidators , login);
authRouter.post('/otp/send', otpSendValidators ,  loginWithOTP);
authRouter.post('/otp/verify',otpVerifyValidators, verifyOTP);
authRouter.post('/logout', logout);

export default authRouter;
