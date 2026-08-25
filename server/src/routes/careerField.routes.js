import { Router } from 'express';
import { listFields } from '../controllers/career.controller.js';

const router = Router();
router.get('/', listFields);

export default router;
