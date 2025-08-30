import { Router } from 'express';
import { postContactForm } from '../controllers/contactus';

const contactUsRouter = Router();

contactUsRouter.post('/' , postContactForm);

export default contactUsRouter;
