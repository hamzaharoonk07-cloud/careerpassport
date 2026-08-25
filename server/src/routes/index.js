import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import careerRoutes from './career.routes.js';
import careerFieldRoutes from './careerField.routes.js';
import quizRoutes from './quiz.routes.js';
import resultRoutes from './result.routes.js';
import savedCareerRoutes from './savedCareer.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/careers', careerRoutes);
router.use('/career-fields', careerFieldRoutes);
router.use('/quiz', quizRoutes);
router.use('/results', resultRoutes);
router.use('/saved-careers', savedCareerRoutes);
router.use('/admin', adminRoutes);

export default router;
