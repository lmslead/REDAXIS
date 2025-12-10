import fs from 'fs';
import path from 'path';
import Payslip from '../models/Payslip.js';
import User from '../models/User.js';
import { isFinanceL3User } from '../middleware/auth.js';
import {
  compressToGzip,
  ensureDirectoryExists,
  getWritableStorageRoot,
  readCompressedFile,
  sanitizePdfFileName,
} from '../utils/fileStorage.js';

const formatPeriodFolder = (year, month) => `${year}_${String(month).padStart(2, '0')}`;

export const getPayslips = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    const query = {};
    const canViewAllPayslips = isFinanceL3User(req.user);

    if (!canViewAllPayslips) {
      query.employee = req.user._id;
    } else if (employeeId) {
      query.employee = employeeId;
    }

    if (month) {
      query.month = parseInt(month, 10);
    }
    if (year) {
      query.year = parseInt(year, 10);
    }

    const payslips = await Payslip.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department position',
        populate: { path: 'department', select: 'name' },
      })
      .populate('uploadedBy', 'firstName lastName employeeId')
      .sort({ year: -1, month: -1 });

    res.status(200).json({ success: true, count: payslips.length, data: payslips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadPayslip = async (req, res) => {
  try {
    const { employeeId, month, year, remarks } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ success: false, message: 'Employee, month and year are required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Payslip PDF is required' });
    }

    const employee = await User.findById(employeeId).select('employeeId firstName lastName');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    let storageRoot;
    try {
      storageRoot = await getWritableStorageRoot();
    } catch (storageError) {
      console.error('Payslip storage validation failed:', storageError);
      return res.status(503).json({ success: false, message: storageError.message });
    }

    const monthValue = parseInt(month, 10);
    const yearValue = parseInt(year, 10);

    const employeeCode = employee.employeeId || employee._id.toString();
    const periodFolder = formatPeriodFolder(yearValue, monthValue);
    const employeeDir = path.join(storageRoot, employeeCode);
    const periodDir = path.join(employeeDir, periodFolder);

    await ensureDirectoryExists(periodDir);

    const sanitizedName = sanitizePdfFileName(req.file.originalname, 'payslip.pdf');
    const finalFileName = `${path.parse(sanitizedName).name}_${Date.now()}.pdf`;
    const storedFileName = `${finalFileName}.gz`;
    const destination = path.join(periodDir, storedFileName);

    let compressedBuffer;
    try {
      compressedBuffer = await compressToGzip(req.file.buffer);
    } catch (compressionError) {
      console.error('Payslip compression failed:', compressionError);
      return res.status(500).json({ success: false, message: 'Unable to compress payslip before saving' });
    }

    await fs.promises.writeFile(destination, compressedBuffer);

    const existingPayslip = await Payslip.findOne({ employee: employeeId, month: monthValue, year: yearValue });

    const payslip = await Payslip.findOneAndUpdate(
      { employee: employeeId, month: monthValue, year: yearValue },
      {
        employee: employeeId,
        month: monthValue,
        year: yearValue,
        fileName: finalFileName,
        filePath: destination,
        fileSize: req.file.size,
        storedFileSize: compressedBuffer.length,
        compression: 'gzip',
        uploadedBy: req.user._id,
        uploadedAt: new Date(),
        remarks,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department position',
        populate: { path: 'department', select: 'name' },
      })
      .populate('uploadedBy', 'firstName lastName employeeId');

    if (existingPayslip?.filePath && existingPayslip.filePath !== destination) {
      fs.promises.unlink(existingPayslip.filePath).catch((unlinkError) => {
        console.warn('Failed to cleanup previous payslip file:', unlinkError.message);
      });
    }

    res.status(200).json({ success: true, data: payslip });
  } catch (error) {
    console.error('Payslip upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Payslip upload failed' });
  }
};

export const downloadPayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id).populate('employee', 'firstName lastName employeeId');

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    const isOwner = payslip.employee?._id?.equals(req.user._id);
    const canViewAllPayslips = isFinanceL3User(req.user);

    if (!isOwner && !canViewAllPayslips) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!fs.existsSync(payslip.filePath)) {
      return res.status(404).json({ success: false, message: 'Payslip file missing from server' });
    }

    let pdfBuffer;
    try {
      pdfBuffer = await readCompressedFile(payslip.filePath, payslip.compression);
    } catch (readError) {
      console.error('Payslip decompression failed:', readError);
      return res.status(500).json({ success: false, message: 'Unable to read payslip from storage' });
    }

    const safeFileName = payslip.fileName?.replace(/"/g, '') || 'payslip.pdf';
    const dispositionType = canViewAllPayslips ? 'attachment' : 'inline';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeFileName}"`);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Payslip download failed:', error);
    res.status(500).json({ success: false, message: error.message || 'Payslip download failed' });
  }
};
