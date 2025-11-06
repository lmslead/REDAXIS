import express from 'express';
import {
  getPayrolls,
  getPayroll,
  createPayroll,
  updatePayroll,
  deletePayroll,
  processPayroll,
} from '../controllers/payrollController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getPayrolls);
router.get('/:id', protect, getPayroll);
router.post('/', protect, authorize('admin', 'hr'), createPayroll);
router.put('/:id', protect, authorize('admin', 'hr'), updatePayroll);
router.delete('/:id', protect, authorize('admin'), deletePayroll);
router.post('/:id/process', protect, authorize('admin', 'hr'), processPayroll);

export default router;
