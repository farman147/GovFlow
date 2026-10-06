import { Router } from 'express';
import { listPredictions, getPredictionByService } from '../controllers/predictionController.js';

const router = Router();

router.get('/', listPredictions);
router.get('/:serviceType', getPredictionByService);

export default router;
