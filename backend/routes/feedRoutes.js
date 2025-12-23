import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getFeeds, createFeed, likeFeed, commentFeed } from '../controllers/feedController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const FEED_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'feed');
if (!fs.existsSync(FEED_UPLOAD_DIR)) {
	fs.mkdirSync(FEED_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, FEED_UPLOAD_DIR),
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname) || '.png';
		const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '') || 'feed-card';
		cb(null, `${Date.now()}-${safeBase}${ext}`);
	},
});

const imageFilter = (req, file, cb) => {
	if (/^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error('Only image uploads are allowed for posts.'));
	}
};

const upload = multer({
	storage,
	fileFilter: imageFilter,
	limits: { fileSize: 5 * 1024 * 1024 },
});

const handleHeroImageUpload = (req, res, next) => {
	upload.single('heroImage')(req, res, (err) => {
		if (err) {
			return res.status(400).json({ success: false, message: err.message });
		}
		return next();
	});
};

router.get('/', protect, getFeeds);
router.post('/', protect, handleHeroImageUpload, createFeed);
router.post('/:id/like', protect, likeFeed);
router.post('/:id/comment', protect, commentFeed);

export default router;
