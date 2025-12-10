import express from 'express';
import multer from 'multer';
import {
  listEmployeeDocuments,
  uploadEmployeeDocument,
  downloadEmployeeDocument,
} from '../controllers/employeeDocumentController.js';
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

router.get('/', protect, listEmployeeDocuments);
router.post('/', protect, authorizeLevel(3), upload.single('document'), uploadEmployeeDocument);
router.get('/:id/download', protect, downloadEmployeeDocument);

export default router;
