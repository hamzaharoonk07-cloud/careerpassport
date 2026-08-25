import { Router } from 'express';
import * as ctrl from '../controllers/savedCareer.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { saveCareerSchema } from '../validators/quiz.schema.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listSaved);
router.post('/', validate(saveCareerSchema), ctrl.saveCareer);
router.delete('/:careerId', ctrl.unsaveCareer);

export default router;
