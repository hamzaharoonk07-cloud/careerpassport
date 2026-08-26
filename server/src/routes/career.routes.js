import { Router } from 'express';
import * as ctrl from '../controllers/career.controller.js';

const router = Router();

// Public — the career bank is browsable without an account.
router.get('/skills', ctrl.listSkills);
router.get('/', ctrl.listCareers);
router.get('/:id/similar', ctrl.similarCareers);
router.get('/:id', ctrl.getCareer);

export default router;
