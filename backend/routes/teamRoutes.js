import express from 'express';
import {
  getTeamMembers,
  getTeamStats,
  getTeamAttendance,
  getTeamLeaves,
  bulkApproveLeaves,
  getTeamPerformance,
  getManagers,
  getTeamCalendar
} from '../controllers/teamController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Team Management Routes
router.get('/members', getTeamMembers);
router.get('/stats', getTeamStats);
router.get('/attendance', getTeamAttendance);
router.get('/leaves', getTeamLeaves);
router.post('/leaves/bulk-approve', bulkApproveLeaves);
router.get('/performance', getTeamPerformance);
router.get('/managers', getManagers);
router.get('/calendar', getTeamCalendar);

export default router;
