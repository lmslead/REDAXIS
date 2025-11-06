import express from 'express';
import { getFeeds, createFeed, likeFeed, commentFeed } from '../controllers/feedController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getFeeds);
router.post('/', protect, createFeed);
router.post('/:id/like', protect, likeFeed);
router.post('/:id/comment', protect, commentFeed);

export default router;
