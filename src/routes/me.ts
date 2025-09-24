import { Router } from 'express';
import { getNotifications, getUser, updateUser } from '../controllers/me';
import { updateUserValidation } from '../validators/me.validator';

const meRouter = Router();

meRouter.get('/', getUser);
meRouter.patch('/', updateUserValidation, updateUser);
meRouter.get('/notifications', getNotifications);

export default meRouter;
