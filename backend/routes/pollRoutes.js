import express from 'express';
import {
  getPolls,
  getPollById,
  createPoll,
  updatePoll,
  deletePoll,
  voteInPoll,
} from '../controllers/pollController.js';
import { protect, authorizeLevel } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getPolls);
router.get('/:id', protect, getPollById);
router.post('/', protect, authorizeLevel(3), createPoll);
router.put('/:id', protect, authorizeLevel(3), updatePoll);
router.delete('/:id', protect, authorizeLevel(3), deletePoll);
router.post('/:id/vote', protect, voteInPoll);

export default router;
