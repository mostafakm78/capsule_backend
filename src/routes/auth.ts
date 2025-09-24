import { Router } from 'express';
import { signup, login, logout, loginWithOTP, verifyOTP, getEmail, refreshAccessToken } from '../controllers/auth';

import { getEmailValidation, loginValidators, otpSendValidators, otpVerifyValidators, signupValidators } from '../validators/auth.validators';
import { userIsBanned } from '../middleware/is-auth';

const authRouter = Router();

authRouter.post('/check', getEmailValidation, getEmail);
authRouter.post('/signup', signupValidators, signup);
authRouter.post('/login', loginValidators, login);
authRouter.post('/refresh', refreshAccessToken);
authRouter.post('/otp/send', otpSendValidators, loginWithOTP);
authRouter.post('/otp/verify', otpVerifyValidators, verifyOTP);
authRouter.post('/logout', logout);

export default authRouter;
