import { Router } from 'express';
import * as c from '../controllers/tokenController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const r = Router();

r.use(protect);

// Token creation
r.post(
  '/',
  authorize('citizen', 'admin'),
  c.create
);

// My tokens
r.get(
  '/my',
  c.mine
);

// Queue
r.get(
  '/queue/:serviceId',
  authorize('staff', 'admin'),
  c.serviceQueue
);

// Call next token
r.post(
  '/queue/:serviceId/call-next',
  authorize('staff', 'admin'),
  c.callNext
);

// Token status
r.get(
  '/:id/status',
  c.status
);

// Get single token
r.get(
  '/:id',
  c.getOne
);

// Call token
r.post(
  '/:id/call',
  authorize('staff', 'admin'),
  c.call
);

// Start service
r.post(
  '/:id/start',
  authorize('staff', 'admin'),
  c.start
);

// Complete service
r.post(
  '/:id/complete',
  authorize('staff', 'admin'),
  c.complete
);

// Skip token
r.post(
  '/:id/skip',
  authorize('staff', 'admin'),
  c.skip
);

// Cancel token
r.post(
  '/:id/cancel',
  c.cancel
);

export default r;