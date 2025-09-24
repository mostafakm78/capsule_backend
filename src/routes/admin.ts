import { Router } from 'express';
import { createCategory, createNotification, deleteCategory, deleteNotification, editCategory, editSingleUser, editSingleUserCapsule, getCapsules, getCategories, getSingleUserCapsule, getSingleUserWithCapsules, getUsers } from '../controllers/admin';
import { requireAdmin, requireAuth } from '../middleware/is-auth';

const adminRouter = Router();

adminRouter.get('/users', requireAuth, requireAdmin, getUsers);
adminRouter.get('/capsules', requireAuth, requireAdmin, getCapsules);
adminRouter.get('/users/:id', requireAuth, requireAdmin, getSingleUserWithCapsules);
adminRouter.patch('/users/:id', requireAuth, requireAdmin, editSingleUser);
adminRouter.get('/users/:id/:capsuleId', requireAuth, requireAdmin, getSingleUserCapsule);
adminRouter.patch('/users/:id/:capsuleId', requireAuth, requireAdmin, editSingleUserCapsule);
adminRouter.get('/categories', requireAuth, requireAdmin, getCategories);
adminRouter.post('/categories/:titleId', requireAuth, requireAdmin, createCategory);
adminRouter.patch('/categories/:titleId/:itemId', requireAuth, requireAdmin, editCategory);
adminRouter.delete('/categories/:titleId/:itemId', requireAuth, requireAdmin, deleteCategory);
adminRouter.post('/notification', requireAuth, requireAdmin, createNotification);
adminRouter.delete('/notification/:notifId', requireAuth, requireAdmin, deleteNotification);

export default adminRouter;
