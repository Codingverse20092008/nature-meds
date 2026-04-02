import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

const uploadDir = path.resolve(env.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    cb(null, `${Date.now()}-${safeBase || 'upload'}.csv`);
  },
});

const allowedMimes = new Set(['text/csv', 'application/vnd.ms-excel', 'application/csv']);

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.has(file.mimetype) || extension === '.csv') {
      cb(null, true);
      return;
    }

    cb(new Error('Only CSV files are allowed'));
  },
  limits: {
    fileSize: Number.parseInt(env.MAX_FILE_SIZE, 10),
    files: 1,
  },
});

export function handleMulterError(
  err: Error | null | undefined,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!err) {
    next();
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: `File size exceeds the maximum allowed limit of ${env.MAX_FILE_SIZE} bytes`,
      });
      return;
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        message: 'Only one file can be uploaded at a time',
      });
      return;
    }
  }

  res.status(400).json({
    success: false,
    message: err.message,
  });
}

export function validateCsvStructure(requiredFields: string[] = ['name']) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file?.path) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      const content = await fs.promises.readFile(req.file.path, 'utf-8');
      const headerLine = content.split(/\r?\n/, 1)[0]?.trim();

      if (!headerLine) {
        res.status(400).json({
          success: false,
          message: 'CSV file is empty',
        });
        return;
      }

      const headers = headerLine
        .split(',')
        .map((value) => value.trim().replace(/"/g, '').toLowerCase());

      const missingFields = requiredFields.filter((field) => !headers.includes(field.toLowerCase()));
      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required columns: ${missingFields.join(', ')}`,
          data: {
            foundHeaders: headers,
            requiredFields,
            missingFields,
          },
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateFileType(req: Request, res: Response, next: NextFunction): void {
  if (!req.file?.path) {
    next();
    return;
  }

  const firstBytes = fs.readFileSync(req.file.path).subarray(0, 200).toString('utf-8');
  if (!firstBytes.includes(',') && !firstBytes.includes('\n')) {
    res.status(400).json({
      success: false,
      message: 'File does not appear to be a valid CSV',
    });
    return;
  }

  next();
}
