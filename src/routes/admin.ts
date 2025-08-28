import { Router } from 'express';
import { editSingleUser, editSingleUserCapsule, getAdmin, getCategories, getSingleUserCapsule, getSingleUserWithCapsules, getUsers, updateAdmin } from '../controllers/admin';
import { requireAdmin, requireAuth } from '../middleware/is-auth';

const adminRouter = Router();

adminRouter.get('/', getAdmin);
adminRouter.patch('/', updateAdmin);
adminRouter.get('/users', requireAuth, requireAdmin, getUsers);
adminRouter.get('/users/:id', requireAuth, requireAdmin, getSingleUserWithCapsules);
adminRouter.patch('/users/:id', requireAuth, requireAdmin, editSingleUser);
adminRouter.get('/users/:id/:capsuleId', requireAuth, requireAdmin, getSingleUserCapsule);
adminRouter.patch('/users/:id/:capsuleId', requireAuth, requireAdmin, editSingleUserCapsule);
adminRouter.get('/categories' , requireAuth , requireAdmin , getCategories)

export default adminRouter;
