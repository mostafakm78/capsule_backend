import { Router } from 'express';
import { signup, login, logout } from '../controllers/auth';

const authRouter = Router();

authRouter.post('/signup', signup);
authRouter.post('/login', login);
// authRouter.post('/refresh' , refresh)
authRouter.post('/logout' , logout)

export default authRouter;
