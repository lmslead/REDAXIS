import express from 'express';
import { acknowledgePolicies } from '../controllers/policyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/acknowledge', protect, acknowledgePolicies);

export default router;
