import { Router } from 'express';
import * as ctrl from '../controllers/public.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

// Reading is open to everyone; submissions attach an account when there is
// one, but do not require it.
// Ask in your own words. No session needed — someone deciding whether to
// register should be able to ask first.
router.post('/ask', ctrl.ask);

router.get('/media', ctrl.listMedia);
router.get('/stories', ctrl.listStories);
router.post('/stories', optionalAuth, ctrl.submitStory);
router.post('/feedback', optionalAuth, ctrl.submitFeedback);

// Your own submissions and their replies. Requires a session — there is no
// way to scope this to an anonymous submitter.
router.get('/feedback/mine', requireAuth, ctrl.myFeedback);

export default router;
