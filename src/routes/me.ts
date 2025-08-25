import { Router } from 'express';
import { getUser, updateUser } from '../controllers/me';


const meRouter = Router();

meRouter.get('/', getUser);
meRouter.patch('/update' , updateUser)

export default meRouter;
