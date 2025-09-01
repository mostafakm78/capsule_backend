import { Router } from 'express';
import { getNotifications, postContactForm } from '../controllers/public';

const publicRouter = Router();

publicRouter.post('/contactus' , postContactForm);
publicRouter.get('/notifications' , getNotifications)

export default publicRouter;
