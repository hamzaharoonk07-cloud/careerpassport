import { Router } from 'express';
import * as ctrl from '../controllers/savedCareer.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { saveCareerSchema } from '../validators/quiz.schema.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listSaved);
router.post('/', validate(saveCareerSchema), ctrl.saveCareer);
// A note is written later than the bookmark, so it has its own route.
router.patch('/:careerId/note', ctrl.updateNote);
router.delete('/:careerId', ctrl.unsaveCareer);

export default router;
