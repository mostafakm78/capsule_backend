import { Router } from 'express';
import { getAdmin } from '../controllers/admin';

const adminRouter = Router();

adminRouter.get('/', getAdmin);

export default adminRouter;
