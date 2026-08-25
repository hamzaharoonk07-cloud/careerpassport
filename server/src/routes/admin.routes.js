import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Both gates, on every route in this file. Role is checked server-side —
// hiding the nav link is presentation, not authorisation.
router.use(requireAuth, requireRole('admin'));

router.get('/stats', ctrl.stats);
router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.patch('/users/:id/role', ctrl.setRole);

export default router;
