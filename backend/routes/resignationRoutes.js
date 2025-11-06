import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  submitResignation,
  getResignations,
  getResignation,
  updateResignationStatus,
  updateExitProcedure,
} from '../controllers/resignationController.js';

const router = express.Router();

router.route('/')
  .get(protect, getResignations)
  .post(protect, submitResignation);

router.route('/:id')
  .get(protect, getResignation);

router.route('/:id/status')
  .patch(protect, updateResignationStatus);

router.route('/:id/exit-procedure')
  .patch(protect, updateExitProcedure);

export default router;
