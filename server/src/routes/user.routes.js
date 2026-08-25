import { Router } from 'express';
import * as ctrl from '../controllers/user.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { updateProfileSchema } from '../validators/auth.schema.js';
import { journeyStageSchema, selectFieldSchema } from '../validators/quiz.schema.js';

const router = Router();
router.use(requireAuth);

router.patch('/me', validate(updateProfileSchema), ctrl.updateProfile);
router.patch('/me/journey', validate(journeyStageSchema), ctrl.updateJourneyStage);
router.patch('/me/field', validate(selectFieldSchema), ctrl.selectField);

export default router;
