import { Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import fs from 'node:fs/promises';
import { ingestProductsCsvFromFile, ingestCategoriesCsv, getImportLogs, getImportLogDetails, retryImport } from '../services/csv-ingestion.js';
import { getDatabase } from '../config/database.js';
import { importLogs } from '../db/schema.js';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Upload and process CSV file
 */
export async function uploadCsv(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a CSV file.',
      });
      return;
    }

    const { type = 'products', mode = 'upsert', autoCreateCategories = 'true' } = req.body;
    const authReq = req as AuthRequest;

    const options = {
      mode: mode as 'insert' | 'update' | 'upsert',
      autoCreateCategories: autoCreateCategories === 'true',
      batchSize: 250,
      validateExpiry: true,
    };
    const fileName = req.file.originalname;
    const filePath = req.file.path;

    let result;

    if (type === 'categories') {
      const buffer = await fs.readFile(filePath);
      result = await ingestCategoriesCsv(buffer, fileName, options);
    } else {
      result = await ingestProductsCsvFromFile(
        filePath,
        fileName,
        options,
        authReq.user?.id
      );
    }

    const statusCode = result.success ? 200 : 400;

    res.status(statusCode).json({
      success: result.success,
      message: result.success
        ? 'CSV processed successfully'
        : 'CSV processing completed with errors',
      data: {
        importLogId: result.importLogId,
        summary: result.summary,
      },
      errors: result.errors.length > 0 ? result.errors.slice(0, 100) : undefined,
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
    });
  } catch (error) {
    console.error('[CsvController] uploadCsv error:', error);
    next(error);
  }
}

/**
 * Get import logs
 */
export async function getImportLogsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { page = '1', limit = '20', status, type } = req.query;

    const filters: Record<string, string> = {};
    if (status) filters.status = status as string;
    if (type) filters.recordType = type as string;

    const result = await getImportLogs(
      Number.parseInt(String(page), 10),
      Number.parseInt(String(limit), 10),
      filters
    );

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[CsvController] getImportLogsController error:', error);
    next(error);
  }
}

/**
 * Get import log details
 */
export async function getImportLogDetailsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const details = await getImportLogDetails(Number.parseInt(asString(id), 10));

    if (!details) {
      res.status(404).json({
        success: false,
        message: 'Import log not found',
      });
      return;
    }

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    console.error('[CsvController] getImportLogDetailsController error:', error);
    next(error);
  }
}

/**
 * Retry failed import
 */
export async function retryImportController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const buffer = req.file?.path ? await fs.readFile(req.file.path) : Buffer.alloc(0);
    const result = await retryImport(Number.parseInt(asString(id), 10), buffer);

    res.json({
      success: result.success,
      message: result.success
        ? 'Import retry successful'
        : 'Import retry completed with errors',
      data: {
        importLogId: result.importLogId,
        summary: result.summary,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('[CsvController] retryImportController error:', error);
    next(error);
  }
}

/**
 * Download CSV template
 */
export async function downloadCsvTemplate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requestedType = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type;
    const type = requestedType ?? 'products';

    let headers: string[];
    let sampleData: string[][];

    if (type === 'categories') {
      headers = ['name', 'slug', 'description', 'parent_category'];
      sampleData = [
        ['Pain Relief', 'pain-relief', 'Medications for pain management', ''],
        ['Vitamins & Supplements', 'vitamins-supplements', 'Health supplements', ''],
        ['First Aid', 'first-aid', 'Emergency medical supplies', ''],
      ];
    } else {
      headers = [
        'sku',
        'name',
        'category',
        'description',
        'price',
        'stock',
        'requires_prescription',
        'expiry_date',
        'manufacturer',
        'dosage',
        'form',
        'strength',
        'image_url',
        'is_featured',
      ];
      sampleData = [
        [
          'PR-001',
          'Paracetamol 500mg',
          'Pain Relief',
          'Effective pain reliever for headaches and minor aches',
          '5.99',
          '100',
          'false',
          '2027-12-31',
          'PharmaCorp',
          '500mg',
          'tablet',
          '500mg',
          '',
          'true',
        ],
        [
          'PR-002',
          'Ibuprofen 400mg',
          'Pain Relief',
          'Anti-inflammatory pain reliever',
          '7.49',
          '75',
          'false',
          '2027-06-30',
          'MediLabs',
          '400mg',
          'capsule',
          '400mg',
          '',
          'false',
        ],
        [
          'RX-001',
          'Amoxicillin 250mg',
          'Antibiotics',
          'Broad-spectrum antibiotic',
          '12.99',
          '50',
          'true',
          '2026-08-15',
          'PharmaCorp',
          '250mg',
          'capsule',
          '250mg',
          '',
          'false',
        ],
      ];
    }

    const csvContent = [
      headers.join(','),
      ...sampleData.map((row) =>
        row
          .map((cell) => {
            // Escape quotes and wrap in quotes if contains comma
            if (cell.includes(',') || cell.includes('"')) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(',')
      ),
    ].join('\n');

    const fileName = type === 'categories' ? 'categories_template.csv' : 'products_template.csv';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('[CsvController] downloadCsvTemplate error:', error);
    next(error);
  }
}

/**
 * Validate CSV without importing
 */
export async function validateCsv(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file?.path) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    const bodyType = Array.isArray(req.body.type) ? req.body.type[0] : req.body.type;
    const type = bodyType ?? 'products';
    const buffer = await fs.readFile(req.file.path);

    // Import parser for validation
    const { parseCsvBuffer, productCsvSchema, categoryCsvSchema } = await import('../services/csv-parser.js');

    const schema = type === 'categories' ? categoryCsvSchema : productCsvSchema;
    const result = parseCsvBuffer(buffer, schema);

    res.json({
      success: result.errors.length === 0,
      message: result.errors.length === 0
        ? 'CSV validation passed'
        : 'CSV validation completed with errors',
      data: {
        summary: result.summary,
      },
      errors: result.errors,
      warnings: result.summary.warnings,
    });
  } catch (error) {
    console.error('[CsvController] validateCsv error:', error);
    next(error);
  }
}

/**
 * Get import statistics
 */
export async function getImportStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();

    const stats = await db
      .select({
        totalImports: sql<number>`count(*)`,
        totalRows: sql<number>`sum(${importLogs.totalRows})`,
        successCount: sql<number>`sum(${importLogs.successCount})`,
        failureCount: sql<number>`sum(${importLogs.failureCount})`,
      })
      .from(importLogs)
      .limit(1);

    const aggregated = stats[0] ?? { totalImports: 0, totalRows: 0, successCount: 0, failureCount: 0 };

    // Get recent imports
    const recentImports = await db
      .select()
      .from(importLogs)
      .orderBy(importLogs.createdAt)
      .limit(5);

    res.json({
      success: true,
      data: {
        aggregated,
        recentImports,
      },
    });
  } catch (error) {
    console.error('[CsvController] getImportStats error:', error);
    next(error);
  }
}
