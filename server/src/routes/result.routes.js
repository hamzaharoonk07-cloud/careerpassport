import { Router } from 'express';
import * as ctrl from '../controllers/quiz.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/me', ctrl.getMyLatestResult);
router.get('/me/all', ctrl.getMyResults);
router.get('/:id', ctrl.getResultById);

export default router;
