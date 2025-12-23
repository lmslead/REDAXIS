import express from 'express';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
  updateEmployeeStatus,
  exportEmployeeJoinings,
} from '../controllers/employeeController.js';
import { protect, authorizeLevel, authorizeHRDepartment } from '../middleware/auth.js';

const router = express.Router();

// Stats require L2+ (Senior Manager and Admin)
router.get('/stats', protect, authorizeLevel(2), getEmployeeStats);
router.get('/export/joinings', protect, authorizeHRDepartment, exportEmployeeJoinings);

// Get employees - handled internally based on level (all can view based on their access)
router.get('/', protect, getEmployees);
router.get('/:id', protect, getEmployee);

// Create/Update/Delete require L2+ (handled in controllers with additional checks)
router.post('/', protect, authorizeLevel(2), createEmployee);
router.put('/:id', protect, authorizeLevel(2), updateEmployee);
router.delete('/:id', protect, authorizeLevel(3), deleteEmployee); // Only L3 can delete

// Update employee status (activate/inactivate/suspend) - L3 and L4 only
router.patch('/:id/status', protect, authorizeLevel(3), updateEmployeeStatus);

export default router;
