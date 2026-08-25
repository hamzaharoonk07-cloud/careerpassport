import { Router } from 'express';
import * as ctrl from '../controllers/quiz.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { submitQuizSchema } from '../validators/quiz.schema.js';

const router = Router();

router.get('/', requireAuth, ctrl.getQuestions);
router.post('/submit', requireAuth, validate(submitQuizSchema), ctrl.submitQuiz);

export default router;
