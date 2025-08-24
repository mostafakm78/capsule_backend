import { Router } from 'express';
import { getUser } from '../controllers/me';


const meRouter = Router();

meRouter.get('/', getUser);

export default meRouter;
