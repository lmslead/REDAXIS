import fs from 'fs';
import path from 'path';
import Payslip from '../models/Payslip.js';
import User from '../models/User.js';

const DEFAULT_PAYSLIP_DIR = '\\\\172.16.1.11\\Agents\\Rgstaffhubpayslip';
const PAYSLIP_STORAGE_PATH = process.env.PAYSLIP_STORAGE_PATH || DEFAULT_PAYSLIP_DIR;

const normalizeStoragePath = (rawPath) => {
  const trimmed = rawPath?.trim();
  if (!trimmed) {
    throw new Error('Payslip storage path is not configured');
  }

  // Force Windows-style separators so UNC shares stay intact regardless of host OS.
  const sanitized = trimmed.replace(/\//g, '\\');
  if (!sanitized.startsWith('\\\\')) {
    throw new Error(`Payslip storage path must be a UNC share (\\\\server\\share). Received: ${sanitized}`);
  }
  return path.win32.normalize(sanitized);
};

const verifyStorageWritable = async (storagePath) => {
  try {
    await fs.promises.access(storagePath, fs.constants.W_OK);
    return storagePath;
  } catch (error) {
    console.error('[Payslip storage] Access check failed', {
      path: storagePath,
      code: error.code,
      message: error.message,
    });

    if (error.code === 'ENOENT') {
      throw new Error(`Payslip storage path is unreachable: ${storagePath}`);
    }
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      throw new Error(`Payslip storage path is not writable: ${storagePath}`);
    }
    throw new Error(`Unable to access payslip storage path: ${storagePath}`);
  }
};

const getWritableStorageRoot = async () => {
  const normalizedPath = normalizeStoragePath(PAYSLIP_STORAGE_PATH);
  return verifyStorageWritable(normalizedPath);
};

const ensureDirectoryExists = async (targetPath) => {
  try {
    await fs.promises.mkdir(targetPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('[Payslip storage] Directory creation failed', {
        path: targetPath,
        code: error.code,
        message: error.message,
      });
      throw new Error('Unable to prepare target folder for payslip upload');
    }
  }
};

const formatPeriodFolder = (year, month) => `${year}_${String(month).padStart(2, '0')}`;

export const getPayslips = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    const query = {};
    const managementLevel = req.user.managementLevel || 0;
    const isFinance = managementLevel >= 3;

    if (!isFinance) {
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

    const safeOriginalName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9_.-]/g, '_') || 'payslip.pdf';
    const sanitizedName = safeOriginalName.toLowerCase().endsWith('.pdf') ? safeOriginalName : `${safeOriginalName}.pdf`;
    const finalFileName = `${path.parse(sanitizedName).name}_${Date.now()}.pdf`;
    const destination = path.join(periodDir, finalFileName);

    await fs.promises.writeFile(destination, req.file.buffer);

    const payslip = await Payslip.findOneAndUpdate(
      { employee: employeeId, month: monthValue, year: yearValue },
      {
        employee: employeeId,
        month: monthValue,
        year: yearValue,
        fileName: finalFileName,
        filePath: destination,
        fileSize: req.file.size,
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
    const isFinance = (req.user.managementLevel || 0) >= 3;

    if (!isOwner && !isFinance) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!fs.existsSync(payslip.filePath)) {
      return res.status(404).json({ success: false, message: 'Payslip file missing from server' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    if (isFinance) {
      return res.download(payslip.filePath, payslip.fileName);
    }

    res.setHeader('Content-Disposition', `inline; filename="${payslip.fileName}"`);
    return res.sendFile(payslip.filePath);
  } catch (error) {
    console.error('Payslip download failed:', error);
    res.status(500).json({ success: false, message: error.message || 'Payslip download failed' });
  }
};
