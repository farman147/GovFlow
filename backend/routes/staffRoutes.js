import { Router } from 'express';
import * as staffController from '../controllers/staffController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(protect);
router.use(authorize('staff'));

router.get('/dashboard', staffController.dashboard);
router.get('/queue', staffController.queue);
router.get('/appointments', staffController.appointments);
router.get('/statistics', staffController.statistics);
router.get('/profile', staffController.profile);

export default router;
