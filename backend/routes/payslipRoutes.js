import express from 'express';
import multer from 'multer';
import { getPayslips, uploadPayslip, downloadPayslip } from '../controllers/payslipController.js';
import { protect, authorizeLevel } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

router.get('/', protect, getPayslips);
router.post('/', protect, authorizeLevel(3), upload.single('payslip'), uploadPayslip);
router.get('/:id/download', protect, downloadPayslip);

export default router;
