import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const DEFAULT_STORAGE_DIR = path.resolve(process.cwd(), '..', 'payslips');
const CONFIGURED_STORAGE_DIR = process.env.PAYSLIP_STORAGE_PATH || DEFAULT_STORAGE_DIR;

export const getConfiguredStorageRoot = () => CONFIGURED_STORAGE_DIR;

export const normalizeStoragePath = (rawPath) => {
  const trimmed = rawPath?.trim();
  if (!trimmed) {
    throw new Error('Document storage path is not configured');
  }

  if (trimmed.startsWith('\\\\')) {
    const sanitized = trimmed.replace(/\//g, '\\');
    return path.win32.normalize(sanitized);
  }

  return path.resolve(trimmed);
};

export const verifyStorageWritable = async (storagePath) => {
  try {
    await fs.promises.access(storagePath, fs.constants.W_OK);
    return storagePath;
  } catch (error) {
    console.error('[Document storage] Access check failed', {
      path: storagePath,
      code: error.code,
      message: error.message,
    });

    if (error.code === 'ENOENT') {
      throw new Error(`Document storage path is unreachable: ${storagePath}`);
    }
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      throw new Error(`Document storage path is not writable: ${storagePath}`);
    }
    throw new Error(`Unable to access document storage path: ${storagePath}`);
  }
};

export const ensureDirectoryExists = async (targetPath) => {
  try {
    await fs.promises.mkdir(targetPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('[Document storage] Directory creation failed', {
        path: targetPath,
        code: error.code,
        message: error.message,
      });
      throw new Error('Unable to prepare target folder for file upload');
    }
  }
};

export const getWritableStorageRoot = async () => {
  const normalizedPath = normalizeStoragePath(CONFIGURED_STORAGE_DIR);
  await ensureDirectoryExists(normalizedPath);
  return verifyStorageWritable(normalizedPath);
};

export const compressToGzip = (buffer) => new Promise((resolve, reject) => {
  zlib.gzip(buffer, { level: 9 }, (err, result) => {
    if (err) {
      return reject(err);
    }
    return resolve(result);
  });
});

export const decompressFromGzip = (buffer) => new Promise((resolve, reject) => {
  zlib.gunzip(buffer, (err, result) => {
    if (err) {
      return reject(err);
    }
    return resolve(result);
  });
});

export const readCompressedFile = async (filePath, compression) => {
  const rawBuffer = await fs.promises.readFile(filePath);
  if (!compression) {
    return rawBuffer;
  }

  if (compression === 'gzip') {
    try {
      return await decompressFromGzip(rawBuffer);
    } catch (error) {
      console.warn('Document gzip decompression failed, serving raw buffer instead', {
        path: filePath,
        message: error.message,
      });
      return rawBuffer;
    }
  }

  
  console.warn('Unsupported document compression marker. Serving raw buffer.', {
    path: filePath,
    compression,
  });
  return rawBuffer;
};

export const sanitizePdfFileName = (originalName, fallback = 'document.pdf') => {
  const safeName = path.basename(originalName || '').replace(/[^a-zA-Z0-9_.-]/g, '_') || fallback;
  return safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;
};
