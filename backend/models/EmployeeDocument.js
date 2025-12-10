import mongoose from 'mongoose';
import { EMPLOYEE_DOCUMENT_TYPE_VALUES } from '../constants/employeeDocuments.js';

const employeeDocumentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  docType: {
    type: String,
    enum: EMPLOYEE_DOCUMENT_TYPE_VALUES,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileSize: Number,
  storedFileSize: Number,
  compression: {
    type: String,
    enum: ['gzip'],
    default: 'gzip',
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

employeeDocumentSchema.index({ employee: 1, docType: 1 }, { unique: true });

const EmployeeDocument = mongoose.model('EmployeeDocument', employeeDocumentSchema);

export default EmployeeDocument;
