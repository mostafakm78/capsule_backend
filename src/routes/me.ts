import { Router } from 'express';
import { getNotifications, getUser, updateUser } from '../controllers/me';

const meRouter = Router();

meRouter.get('/', getUser);
meRouter.patch('/', updateUser);
meRouter.get('/notifications' , getNotifications)

export default meRouter;
