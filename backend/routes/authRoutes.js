import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { register, login, getMe, updateProfile, changePassword, uploadProfileImage } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Profile image upload configuration
const PROFILE_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'profiles');
if (!fs.existsSync(PROFILE_UPLOAD_DIR)) {
  fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
}

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PROFILE_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `profile-${req.user.id}-${Date.now()}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  if (/^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (PNG, JPG, GIF, WEBP) are allowed.'));
  }
};

const profileUpload = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const handleProfileImageUpload = (req, res, next) => {
  profileUpload.single('profileImage')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next();
  });
};

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/profile-image', protect, handleProfileImageUpload, uploadProfileImage);

export default router;
