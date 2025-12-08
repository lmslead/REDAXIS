import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import Payslip from '../models/Payslip.js';
import User from '../models/User.js';

const DEFAULT_PAYSLIP_DIR = path.resolve(process.cwd(), '..', 'payslips');
const PAYSLIP_STORAGE_PATH = process.env.PAYSLIP_STORAGE_PATH || DEFAULT_PAYSLIP_DIR;

const normalizeStoragePath = (rawPath) => {
  const trimmed = rawPath?.trim();
  if (!trimmed) {
    throw new Error('Payslip storage path is not configured');
  }

  if (trimmed.startsWith('\\\\')) {
    const sanitized = trimmed.replace(/\//g, '\\');
    return path.win32.normalize(sanitized);
  }

  return path.resolve(trimmed);
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

      const readPayslipBuffer = async (filePath, compression) => {
        const rawBuffer = await fs.promises.readFile(filePath);
        if (!compression) {
          return rawBuffer;
        }

        if (compression === 'gzip') {
          return decompressFromGzip(rawBuffer);
        }

        throw new Error(`Unsupported payslip compression format: ${compression}`);
      };
  }
};

const getWritableStorageRoot = async () => {
  const normalizedPath = normalizeStoragePath(PAYSLIP_STORAGE_PATH);
  await ensureDirectoryExists(normalizedPath);
  return verifyStorageWritable(normalizedPath);
};

const compressToGzip = (buffer) => new Promise((resolve, reject) => {
  zlib.gzip(buffer, { level: 9 }, (err, result) => {
    if (err) {
      return reject(err);
    }
    return resolve(result);
  });
});

const decompressFromGzip = (buffer) => new Promise((resolve, reject) => {
  zlib.gunzip(buffer, (err, result) => {
    if (err) {
      return reject(err);
    }
    return resolve(result);
  });
});

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
    const isFinance = (req.user.managementLevel || 0) >= 3;

    if (!isOwner && !isFinance) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!fs.existsSync(payslip.filePath)) {
      return res.status(404).json({ success: false, message: 'Payslip file missing from server' });
    }

    let pdfBuffer;
    try {
      pdfBuffer = await readPayslipBuffer(payslip.filePath, payslip.compression);
    } catch (readError) {
      console.error('Payslip decompression failed:', readError);
      return res.status(500).json({ success: false, message: 'Unable to read payslip from storage' });
    }

    const safeFileName = payslip.fileName?.replace(/"/g, '') || 'payslip.pdf';
    const dispositionType = isFinance ? 'attachment' : 'inline';

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
