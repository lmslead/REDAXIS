import express from 'express';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getDepartments);
router.post('/', protect, authorize('admin', 'hr'), createDepartment);
router.put('/:id', protect, authorize('admin', 'hr'), updateDepartment);
router.delete('/:id', protect, authorize('admin', 'hr'), deleteDepartment);

export default router;
