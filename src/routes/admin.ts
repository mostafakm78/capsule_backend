import { Router } from 'express';
import { getAdmin, getSingleUserCapsule, getSingleUserWithCapsules, getUsers, updateAdmin } from '../controllers/admin';
import { requireAdmin, requireAuth } from '../middleware/is-auth';

const adminRouter = Router();

adminRouter.get('/', getAdmin);
adminRouter.patch('/', updateAdmin);
adminRouter.get('/users', requireAuth, requireAdmin, getUsers);
adminRouter.get('/users/:id', requireAuth, requireAdmin, getSingleUserWithCapsules);
adminRouter.get('/users/:id/:capsuleId', requireAuth, requireAdmin, getSingleUserCapsule);
// adminRouter.get('/users/:id/capsules', requireAuth , requireAdmin , getUserCapsules)
// adminRouter.get('/users/capsules', requireAuth , requireAdmin , getCapsules)

export default adminRouter;
