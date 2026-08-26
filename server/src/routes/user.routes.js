import { Router } from 'express';
import express from 'express';
import * as ctrl from '../controllers/user.controller.js';
import * as resume from '../controllers/resume.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { updateProfileSchema } from '../validators/auth.schema.js';
import { journeyStageSchema, selectFieldSchema } from '../validators/quiz.schema.js';

const router = Router();
router.use(requireAuth);

router.patch('/me', validate(updateProfileSchema), ctrl.updateProfile);
router.patch('/me/journey', validate(journeyStageSchema), ctrl.updateJourneyStage);
router.patch('/me/field', validate(selectFieldSchema), ctrl.selectField);

// Base64 in JSON, so this route needs a larger body than the rest.
router.post('/me/resume', express.json({ limit: '3mb' }), resume.uploadResume);
router.get('/me/resume', resume.downloadResume);
router.delete('/me/resume', resume.deleteResume);

export default router;
