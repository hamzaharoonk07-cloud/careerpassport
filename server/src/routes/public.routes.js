import { Router } from 'express';
import * as ctrl from '../controllers/public.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Reading is open to everyone; submissions attach an account when there is
// one, but do not require it.
router.get('/media', ctrl.listMedia);
router.get('/stories', ctrl.listStories);
router.post('/stories', optionalAuth, ctrl.submitStory);
router.post('/feedback', optionalAuth, ctrl.submitFeedback);

export default router;
