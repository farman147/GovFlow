import express from 'express';
import { queryAssistant, getAssistantInsights } from '../controllers/assistantController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/query', optionalAuth, queryAssistant);
router.post('/chat', optionalAuth, queryAssistant);
router.get('/insights', optionalAuth, getAssistantInsights);

export default router;
