import express from 'express';
import { getRecognitions, createRecognition, likeRecognition } from '../controllers/recognitionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getRecognitions);
router.post('/', protect, createRecognition);
router.post('/:id/like', protect, likeRecognition);

export default router;
