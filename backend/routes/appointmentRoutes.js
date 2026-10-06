import { Router } from 'express';
import * as c from '../controllers/appointmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const r = Router();
r.use(protect);
r.post('/', c.create);
r.get('/my', c.mine);
r.get('/:id', c.getOne);
r.put('/:id/cancel', c.cancel);
r.post('/:id/check-in', c.checkIn);
r.put('/:id/complete', c.complete);
r.post('/:id/complete', c.complete);

export default r;

