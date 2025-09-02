import { Router } from 'express';
import { postContactForm } from '../controllers/public';

const publicRouter = Router();

publicRouter.post('/contactus' , postContactForm);

export default publicRouter;
