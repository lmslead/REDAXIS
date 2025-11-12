import express from 'express';
import {
  getAttendance,
  createAttendance,
  checkIn,
  checkOut,
  updateAttendance,
  getAttendanceStats,
  getLocationConfig,
} from '../controllers/attendanceController.js';
import { protect, authorizeLevel } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
// getAttendance and getAttendanceStats handle level-based filtering internally
router.get('/', protect, getAttendance);
router.get('/stats', protect, getAttendanceStats);
router.get('/location-config', protect, getLocationConfig);

// Only L1+ (Manager and above) can manually create/update attendance
router.post('/', protect, authorizeLevel(1), createAttendance);
router.put('/:id', protect, authorizeLevel(1), updateAttendance);

// Everyone can check in/out
router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);

export default router;
