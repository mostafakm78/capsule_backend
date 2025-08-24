import { Router } from 'express';
import { signup, login } from '../controllers/auth';
import { requireAuth } from '../middleware/is-auth';

const authRouter = Router();

authRouter.post('/signup', signup);
authRouter.post('/login', login);

export default authRouter;
