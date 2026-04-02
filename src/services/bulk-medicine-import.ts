import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ingestProductsCsvFromFile } from './csv-ingestion.js';

export interface BulkImportResult {
  success: boolean;
  totalProcessed: number;
  inserted: number;
  updated: number;
  failed: number;
  skipped: number;
  errors: ImportError[];
  duration: number;
}

export interface ImportError {
  row: number;
  file: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface BulkImportOptions {
  batchSize?: number;
  autoCreateCategories?: boolean;
  onProgress?: (progress: BulkImportProgress) => void;
}

export interface BulkImportProgress {
  currentFile: string;
  filesProcessed: number;
  totalFiles: number;
  rowsProcessed: number;
  totalRows: number;
  inserted: number;
  updated: number;
  failed: number;
  percentage: number;
}

export async function bulkImportMedicines(
  directoryPath: string,
  options: BulkImportOptions = {}
): Promise<BulkImportResult> {
  const startTime = Date.now();
  const errors: ImportError[] = [];
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;
  const files = (await readdir(directoryPath))
    .filter((f) => f.endsWith('.csv'))
    .sort();

  if (files.length === 0) {
    return {
      success: false,
      totalProcessed: 0,
      inserted: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [{ row: 0, file: '', message: 'No CSV files found in directory' }],
      duration: 0,
    };
  }

  const totalFiles = files.length;

  for (const [index, file] of files.entries()) {
    const filePath = join(directoryPath, file);

    try {
      const result = await ingestProductsCsvFromFile(filePath, file, {
        mode: 'upsert',
        autoCreateCategories: options.autoCreateCategories ?? true,
        batchSize: options.batchSize ?? 500,
        validateExpiry: true,
      });

      totalInserted += result.summary.inserted;
      totalUpdated += result.summary.updated;
      totalFailed += result.summary.failed;
      totalSkipped += result.summary.skipped;
      totalProcessed += result.summary.totalRows;

      errors.push(
        ...result.errors.map((error) => ({
          row: error.row,
          file,
          message: error.message,
        }))
      );
    } catch (error) {
      totalFailed++;
      errors.push({
        row: 0,
        file: file,
        message: `File processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    options.onProgress?.({
      currentFile: file,
      filesProcessed: index + 1,
      totalFiles,
      rowsProcessed: totalProcessed,
      totalRows: totalProcessed,
      inserted: totalInserted,
      updated: totalUpdated,
      failed: totalFailed,
      percentage: Math.round(((index + 1) / totalFiles) * 100),
    });
  }

  const duration = Date.now() - startTime;

  return {
    success: totalInserted + totalUpdated > 0,
    totalProcessed,
    inserted: totalInserted,
    updated: totalUpdated,
    failed: totalFailed,
    skipped: totalSkipped,
    errors,
    duration,
  };
}

export async function quickImportMedicines(
  directoryPath: string,
  onProgress?: (progress: { file: string; count: number }) => void
): Promise<BulkImportResult> {
  const result = await bulkImportMedicines(directoryPath, {
    batchSize: 1000,
    autoCreateCategories: true,
    onProgress: (progress) => {
      onProgress?.({
        file: progress.currentFile,
        count: progress.rowsProcessed,
      });
    },
  });

  return result;
}
