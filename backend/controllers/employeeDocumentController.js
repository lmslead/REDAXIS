import fs from 'fs';
import path from 'path';
import EmployeeDocument from '../models/EmployeeDocument.js';
import User from '../models/User.js';
import {
  EMPLOYEE_DOCUMENT_TYPES,
  EMPLOYEE_DOCUMENT_TYPE_VALUES,
  EMPLOYEE_DOCUMENT_FOLDER,
} from '../constants/employeeDocuments.js';
import {
  compressToGzip,
  ensureDirectoryExists,
  getWritableStorageRoot,
  readCompressedFile,
  sanitizePdfFileName,
} from '../utils/fileStorage.js';

const DOC_TYPE_LOOKUP = new Map(EMPLOYEE_DOCUMENT_TYPES.map((type) => [type.key, type]));

const isL3User = (user) => (user?.managementLevel || 0) >= 3;

const resolveEmployeeDirectory = async (employeeCode, docTypeKey) => {
  const storageRoot = await getWritableStorageRoot();
  const documentsRoot = path.join(storageRoot, EMPLOYEE_DOCUMENT_FOLDER);
  await ensureDirectoryExists(documentsRoot);

  const employeeDir = path.join(documentsRoot, employeeCode);
  const typeDir = path.join(employeeDir, docTypeKey);
  await ensureDirectoryExists(typeDir);

  return typeDir;
};

export const listEmployeeDocuments = async (req, res) => {
  try {
    const { employeeId, docType } = req.query;
    const canManage = isL3User(req.user);

    if (docType && !DOC_TYPE_LOOKUP.has(docType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type filter' });
    }

    const query = {};
    if (canManage && employeeId) {
      query.employee = employeeId;
    } else {
      query.employee = req.user._id;
    }

    if (docType) {
      query.docType = docType;
    }

    const documents = await EmployeeDocument.find(query)
      .populate('employee', 'firstName lastName employeeId status')
      .populate('uploadedBy', 'firstName lastName employeeId');

    res.status(200).json({
      success: true,
      data: documents,
      docTypes: EMPLOYEE_DOCUMENT_TYPES,
      canManage,
    });
  } catch (error) {
    console.error('Employee documents fetch failed:', error);
    res.status(500).json({ success: false, message: error.message || 'Unable to fetch employee documents' });
  }
};

export const uploadEmployeeDocument = async (req, res) => {
  try {
    if (!isL3User(req.user)) {
      return res.status(403).json({ success: false, message: 'Only L3 users can upload documents' });
    }

    const { employeeId, docType } = req.body;

    if (!employeeId || !docType) {
      return res.status(400).json({ success: false, message: 'Employee and document type are required' });
    }

    if (!EMPLOYEE_DOCUMENT_TYPE_VALUES.includes(docType)) {
      return res.status(400).json({ success: false, message: 'Unsupported document type' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Document PDF is required' });
    }

    const employee = await User.findById(employeeId).select('employeeId firstName lastName status');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    let targetDir;
    try {
      const employeeCode = employee.employeeId || employee._id.toString();
      targetDir = await resolveEmployeeDirectory(employeeCode, docType);
    } catch (storageError) {
      console.error('Employee document storage validation failed:', storageError);
      return res.status(503).json({ success: false, message: storageError.message });
    }

    const sanitizedName = sanitizePdfFileName(req.file.originalname, `${docType}.pdf`);
    const finalFileName = `${path.parse(sanitizedName).name}_${Date.now()}.pdf`;
    const storedFileName = `${finalFileName}.gz`;
    const destination = path.join(targetDir, storedFileName);

    let compressedBuffer;
    try {
      compressedBuffer = await compressToGzip(req.file.buffer);
    } catch (compressionError) {
      console.error('Employee document compression failed:', compressionError);
      return res.status(500).json({ success: false, message: 'Unable to compress document before saving' });
    }

    await fs.promises.writeFile(destination, compressedBuffer);

    const existingDocument = await EmployeeDocument.findOne({ employee: employeeId, docType });

    const documentRecord = await EmployeeDocument.findOneAndUpdate(
      { employee: employeeId, docType },
      {
        employee: employeeId,
        docType,
        fileName: finalFileName,
        filePath: destination,
        fileSize: req.file.size,
        storedFileSize: compressedBuffer.length,
        compression: 'gzip',
        uploadedBy: req.user._id,
        uploadedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate('employee', 'firstName lastName employeeId status')
      .populate('uploadedBy', 'firstName lastName employeeId');

    if (existingDocument?.filePath && existingDocument.filePath !== destination) {
      fs.promises.unlink(existingDocument.filePath).catch((unlinkError) => {
        console.warn('Failed to cleanup previous document file:', unlinkError.message);
      });
    }

    res.status(200).json({ success: true, data: documentRecord });
  } catch (error) {
    console.error('Employee document upload failed:', error);
    res.status(500).json({ success: false, message: error.message || 'Document upload failed' });
  }
};

export const downloadEmployeeDocument = async (req, res) => {
  try {
    const document = await EmployeeDocument.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId');

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const canManage = isL3User(req.user);
    const isOwner = document.employee?._id?.equals(req.user._id);

    if (!canManage && !isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ success: false, message: 'Document file missing from server' });
    }

    let pdfBuffer;
    try {
      pdfBuffer = await readCompressedFile(document.filePath, document.compression);
    } catch (readError) {
      console.error('Employee document decompression failed:', readError);
      return res.status(500).json({ success: false, message: 'Unable to read document from storage' });
    }

    const safeFileName = document.fileName?.replace(/"/g, '') || 'document.pdf';
    const dispositionType = canManage && !isOwner ? 'attachment' : 'inline';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeFileName}"`);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Employee document download failed:', error);
    res.status(500).json({ success: false, message: error.message || 'Document download failed' });
  }
};
