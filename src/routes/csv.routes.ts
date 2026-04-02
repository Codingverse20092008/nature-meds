import { Router } from 'express';
import { upload, validateCsvStructure, validateFileType } from '../middleware/upload.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import {
  uploadCsv,
  getImportLogsController,
  getImportLogDetailsController,
  retryImportController,
  downloadCsvTemplate,
  validateCsv,
  getImportStats,
} from '../controllers/csv.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

// Upload and process CSV
router.post(
  '/upload',
  upload.single('file'),
  validateFileType,
  validateCsvStructure(['name']),
  asyncHandler(uploadCsv)
);

// Validate CSV without importing
router.post(
  '/validate',
  upload.single('file'),
  validateFileType,
  asyncHandler(validateCsv)
);

// Get import logs
router.get('/logs', asyncHandler(getImportLogsController));

// Get import log details
router.get('/logs/:id', asyncHandler(getImportLogDetailsController));

// Retry failed import
router.post(
  '/retry/:id',
  upload.single('file'),
  asyncHandler(retryImportController)
);

// Download CSV template
router.get('/template', asyncHandler(downloadCsvTemplate));

// Get import statistics
router.get('/stats', asyncHandler(getImportStats));

export default router;
