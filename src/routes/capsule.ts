import { Router } from 'express';
import { createCapsule, deleteCapsule, editCapsule, getCapsules, getSingleCapsule } from '../controllers/capsules';
import { requireAuth } from '../middleware/is-auth';

const capsuleRoute = Router();

capsuleRoute.get('/', getCapsules);
capsuleRoute.post('/', createCapsule);
capsuleRoute.get('/:id', requireAuth, getSingleCapsule);
capsuleRoute.delete('/:id', requireAuth, deleteCapsule);
capsuleRoute.patch('/:id', requireAuth, editCapsule);

export default capsuleRoute;
