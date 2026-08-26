import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller.js';
import * as content from '../controllers/adminContent.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Both gates, on every route in this file. Role is checked server-side —
// hiding the nav link is presentation, not authorisation.
router.use(requireAuth, requireRole('admin'));

/* ── Overview and people ──────────────────────────────────────── */
router.get('/stats', ctrl.stats);
router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.patch('/users/:id/role', ctrl.setRole);
router.delete('/users/:id', ctrl.deleteUser);

/* ── Career profiles ──────────────────────────────────────────── */
router.get('/careers', content.listCareers);
router.post('/careers', content.createCareer);
router.patch('/careers/:id', content.updateCareer);
router.delete('/careers/:id', content.deleteCareer);

/* ── Quiz questions and scoring ───────────────────────────────── */
router.get('/questions', content.listQuestions);
router.post('/questions', content.createQuestion);
router.patch('/questions/:id', content.updateQuestion);
router.delete('/questions/:id', content.deleteQuestion);

// Options hang off their question, so they are addressed through it.
router.post('/questions/:id/options', content.createOption);
router.patch('/questions/:id/options/:optionId', content.updateOption);
router.delete('/questions/:id/options/:optionId', content.deleteOption);

/* ── Multimedia centre ────────────────────────────────────────── */
router.get('/media', content.listMedia);
router.post('/media', content.createMedia);
router.patch('/media/:id', content.updateMedia);
router.delete('/media/:id', content.deleteMedia);

/* ── Feedback ─────────────────────────────────────────────────── */
router.get('/feedback', content.listFeedback);
router.patch('/feedback/:id', content.updateFeedback);
router.delete('/feedback/:id', content.deleteFeedback);

/* ── Success stories ──────────────────────────────────────────── */
router.get('/stories', content.listStories);
router.post('/stories', content.createStory);
router.patch('/stories/:id', content.updateStory);
router.delete('/stories/:id', content.deleteStory);

export default router;
