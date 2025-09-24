import { Router } from 'express';
import { createCapsule, deleteCapsule, editCapsule, getCapsules, getCategories, getSingleCapsule } from '../controllers/capsules';
import { requireAuth } from '../middleware/is-auth';
import { createCapsuleValidation, editCapsuleValidation } from '../validators/capsule.validator';

const capsuleRoute = Router();

capsuleRoute.get('/categories', requireAuth, getCategories);
capsuleRoute.get('/', requireAuth, getCapsules);
capsuleRoute.post('/', requireAuth, createCapsuleValidation, createCapsule);
capsuleRoute.get('/:id', requireAuth, getSingleCapsule);
capsuleRoute.delete('/:id', requireAuth, deleteCapsule);
capsuleRoute.patch('/:id', requireAuth, editCapsuleValidation, editCapsule);

export default capsuleRoute;
