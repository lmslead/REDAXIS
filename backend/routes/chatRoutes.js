import express from 'express';
import { getChats, sendMessage } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getChats);
router.post('/send', protect, sendMessage);

export default router;
