import { Router } from 'express';
import { getAdmin } from '../controllers/admin';
import { requireAdmin, requireAuth } from '../middleware/is-auth';

const adminRouter = Router();

adminRouter.get('/', requireAuth, requireAdmin, getAdmin);
// adminRouter.get('/users', requireAuth , requireAdmin , getUsers)
// adminRouter.get('/users/:id/capsules', requireAuth , requireAdmin , getUserCapsules)
// adminRouter.get('/users/capsules', requireAuth , requireAdmin , getCapsules)

export default adminRouter;
