import { Router } from 'express';

import * as c from '../controllers/serviceController.js';

import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const r = Router();

// ==========================================
// PUBLIC ROUTES
// These can be accessed without login
// ==========================================

// Get all government services
r.get('/', c.list);


// ==========================================
// AUTHENTICATED ROUTES
// Login required from here
// ==========================================

r.get('/details/:id', protect, c.getAssistantDetails);

r.get('/:id/details', protect, c.getAssistantDetails);

r.get('/:id/assistant', protect, c.getAssistantDetails);

r.get('/:id', protect, c.getOne);


// ==========================================
// ADMIN ROUTES
// Login + admin role required
// ==========================================

r.post('/', protect, authorize('admin'), c.create);

r.put('/:id', protect, authorize('admin'), c.update);

r.delete('/:id', protect, authorize('admin'), c.remove);


export default r;