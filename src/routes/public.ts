import { Router } from 'express';
import { getCapsules, getCategories, getSingleCapsule, getUserCapsules, postContactForm } from '../controllers/public';

const publicRouter = Router();

publicRouter.get('/categories', getCategories);
publicRouter.post('/contactus', postContactForm);
publicRouter.get('/capsules', getCapsules);
publicRouter.get('/capsules/:id', getSingleCapsule);
publicRouter.get('/usercapsules/:userId', getUserCapsules);

export default publicRouter;
