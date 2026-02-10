import express from 'express';
import {
	getLeaves,
	createLeave,
	updateLeaveStatus,
	deleteLeave,
	syncAllApprovedLeaves,
	updateLeaveBalance,
} from '../controllers/leaveController.js';
import { triggerEscalationCheck } from '../utils/escalationService.js';
import { protect, authorize, authorizeFinanceL3OrL4 } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getLeaves);
router.post('/sync-attendance', protect, authorize('admin', 'hr'), syncAllApprovedLeaves);
router.post('/check-escalations', protect, authorize('admin', 'hr'), triggerEscalationCheck);
router.put('/balance/:employeeId', protect, authorizeFinanceL3OrL4, updateLeaveBalance);
router.post('/', protect, createLeave);
router.patch('/:id/status', protect, updateLeaveStatus); // Allow RMs to approve
router.put('/:id/status', protect, updateLeaveStatus); // Allow RMs to approve
router.delete('/:id', protect, deleteLeave);

export default router;
