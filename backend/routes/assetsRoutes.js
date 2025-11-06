import express from 'express';
import {
  getAssets,
  addAsset,
  revokeAsset,
} from '../controllers/assetsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.get('/', protect, getAssets);
router.post('/:employeeId', protect, addAsset);
router.put('/:employeeId/:assetId/revoke', protect, revokeAsset);

export default router;
