import fs from 'node:fs/promises';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { categories, importLogs, products, type NewCategory, type NewProduct } from '../db/schema.js';
import {
  categoryCsvSchema,
  formatErrorReport,
  CsvError,
  generateSlug,
  normalizeProductData,
  parseCsvBuffer,
  productCsvSchema,
  streamProcessCsv,
  type ParsedProductRow,
} from './csv-parser.js';
import { getDatabase } from '../config/database.js';

export interface IngestionResult {
  success: boolean;
  importLogId?: number;
  summary: {
    totalRows: number;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors: CsvError[];
  warnings: string[];
}

export interface IngestionOptions {
  mode: 'insert' | 'update' | 'upsert';
  autoCreateCategories?: boolean;
  batchSize?: number;
  validateExpiry?: boolean;
}
interface BatchOutcome {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
}

type ExistingProductRecord = {
  id: number;
  sku: string | null;
  name: string;
  categoryId: number | null;
};

function normalizeCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function toProductInsert(row: ParsedProductRow, categoryId: number | null): NewProduct {
  return {
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    genericName: row.genericName,
    categoryId,
    description: row.description,
    price: row.price,
    stock: row.stock,
    requiresPrescription: row.requiresPrescription,
    expiryDate: row.expiryDate,
    manufacturer: row.manufacturer,
    dosage: row.dosage,
    form: row.form,
    strength: row.strength,
    imageUrl: row.imageUrl,
    isActive: true,
    isFeatured: row.isFeatured,
  };
}

async function ensureCategories(
  names: string[],
  autoCreateCategories: boolean,
  cache: Map<string, number>
): Promise<void> {
  const db = getDatabase();
  const normalized = [...new Set(names.map(normalizeCategoryName))].filter(Boolean);
  const missingFromCache = normalized.filter((name) => !cache.has(name));

  if (missingFromCache.length === 0) {
    return;
  }

  const existing = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(inArray(categories.name, missingFromCache));

  existing.forEach((category) => {
    cache.set(normalizeCategoryName(category.name), category.id);
  });

  const toCreate = missingFromCache.filter((name) => !cache.has(name));
  if (toCreate.length > 0 && autoCreateCategories) {
    const newCategories: NewCategory[] = toCreate.map((name) => ({
      name,
      slug: generateSlug(name),
      description: `Auto-created from CSV import for ${name}`,
    }));

    await db.insert(categories).values(newCategories).onConflictDoNothing();

    const created = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(inArray(categories.name, toCreate));

    created.forEach((category) => {
      cache.set(normalizeCategoryName(category.name), category.id);
    });
  }
}

async function findExistingProducts(rows: ParsedProductRow[], categoryMap: Map<string, number>): Promise<ExistingProductRecord[]> {
  const skuValues = rows.map((row) => row.sku).filter((value): value is string => Boolean(value));
  const names = [...new Set(rows.map((row) => row.name))];
  const conditions = [];

  if (skuValues.length > 0) {
    conditions.push(inArray(products.sku, skuValues));
  }

  if (names.length > 0) {
    conditions.push(inArray(products.name, names));
  }

  if (conditions.length === 0) {
    return [];
  }

  const existing = await getDatabase()
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(or(...conditions));

  return existing.filter((item) =>
    rows.some((candidate) => {
      const categoryId = categoryMap.get(candidate.category) ?? null;
      return (candidate.sku && item.sku === candidate.sku) || (item.name === candidate.name && item.categoryId === categoryId);
    })
  );
}

async function flushProductBatch(
  rows: Array<{ row: ParsedProductRow; rowNumber: number }>,
  options: IngestionOptions,
  categoryCache: Map<string, number>,
  errors: CsvError[]
): Promise<BatchOutcome> {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  }

  const db = getDatabase();
  await ensureCategories(rows.map(({ row }) => row.category), options.autoCreateCategories ?? true, categoryCache);
  const existingRecords = await findExistingProducts(rows.map(({ row }) => row), categoryCache);
  const existingBySku = new Map<string, ExistingProductRecord>();
  const existingByNameCategory = new Map<string, ExistingProductRecord>();

  existingRecords.forEach((record) => {
    if (record.sku) {
      existingBySku.set(record.sku, record);
    }
    existingByNameCategory.set(`${record.name}::${record.categoryId ?? 'null'}`, record);
  });

  const inserts: NewProduct[] = [];
  const updates: Array<{ id: number; values: Partial<NewProduct> }> = [];
  let skipped = 0;
  let failed = 0;

  for (const entry of rows) {
    const { row, rowNumber } = entry;
    const categoryId = categoryCache.get(row.category) ?? null;

    if ((options.autoCreateCategories ?? true) === false && categoryId === null) {
      failed += 1;
      errors.push({
        row: rowNumber,
        field: 'category',
        value: row.category,
        message: 'Category does not exist and autoCreateCategories=false',
      });
      continue;
    }

    const lookupKey = `${row.name}::${categoryId ?? 'null'}`;
    const existing = (row.sku ? existingBySku.get(row.sku) : undefined) ?? existingByNameCategory.get(lookupKey);

    if (!existing) {
      inserts.push(toProductInsert(row, categoryId));
      continue;
    }

    if (options.mode === 'insert') {
      skipped += 1;
      continue;
    }

    updates.push({
      id: existing.id,
      values: {
        ...toProductInsert(row, categoryId),
        updatedAt: new Date().toISOString(),
      },
    });
  }

  if (inserts.length > 0) {
    await db.insert(products).values(inserts).onConflictDoNothing();
  }

  for (const update of updates) {
    await db.update(products).set(update.values).where(eq(products.id, update.id));
  }

  return {
    inserted: inserts.length,
    updated: updates.length,
    skipped,
    failed,
  };
}

async function createImportLog(values: typeof importLogs.$inferInsert): Promise<number> {
  const [created] = await getDatabase().insert(importLogs).values(values).returning({ id: importLogs.id });
  return created.id;
}

export async function ingestProductsCsvFromFile(
  filePath: string,
  fileName: string,
  options: IngestionOptions = { mode: 'upsert', autoCreateCategories: true, batchSize: 250, validateExpiry: true },
  processedBy?: number
): Promise<IngestionResult> {
  const errors: CsvError[] = [];
  const warnings: string[] = [];
  const categoryCache = new Map<string, number>();
  const batch: Array<{ row: ParsedProductRow; rowNumber: number }> = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const parsed = await streamProcessCsv(filePath, productCsvSchema, {
    onValidRow: async (row, rowNumber) => {
      try {
        const normalized = normalizeProductData(row);
        batch.push({ row: normalized, rowNumber });

        if (batch.length >= (options.batchSize ?? 250)) {
          const outcome = await flushProductBatch(batch.splice(0, batch.length), options, categoryCache, errors);
          inserted += outcome.inserted;
          updated += outcome.updated;
          skipped += outcome.skipped;
          failed += outcome.failed;
        }
      } catch (error) {
        failed += 1;
        errors.push({
          row: rowNumber,
          field: 'processing',
          value: JSON.stringify(row),
          message: error instanceof Error ? error.message : 'Invalid row',
        });
      }
    },
  });

  errors.push(...parsed.errors);
  failed += parsed.errors.length;

  if (batch.length > 0) {
    const outcome = await flushProductBatch(batch.splice(0, batch.length), options, categoryCache, errors);
    inserted += outcome.inserted;
    updated += outcome.updated;
    skipped += outcome.skipped;
    failed += outcome.failed;
  }

  const importLogId = await createImportLog({
    fileName,
    sourceFilePath: filePath,
    recordType: 'products',
    importMode: options.mode,
    overwriteStrategy: options.mode === 'insert' ? 'skip_duplicates' : 'update_existing',
    totalRows: parsed.summary.totalRows,
    successCount: inserted + updated,
    failureCount: failed,
    skippedCount: skipped,
    status: inserted + updated > 0 ? 'completed' : 'failed',
    errorReport: errors.length > 0 ? formatErrorReport(errors) : null,
    metadata: JSON.stringify({
      warnings,
      batchSize: options.batchSize ?? 250,
      validateExpiry: options.validateExpiry ?? true,
    }),
    processedBy: processedBy ?? null,
  });

  return {
    success: inserted + updated > 0,
    importLogId,
    summary: {
      totalRows: parsed.summary.totalRows,
      inserted,
      updated,
      skipped,
      failed,
    },
    errors,
    warnings,
  };
}

export async function ingestProductsCsv(
  buffer: Buffer,
  fileName: string,
  options: IngestionOptions = { mode: 'upsert', autoCreateCategories: true, batchSize: 250, validateExpiry: true },
  processedBy?: number
): Promise<IngestionResult> {
  const tempFile = `.tmp-${Date.now()}-${fileName}`;
  await fs.writeFile(tempFile, buffer);

  try {
    return await ingestProductsCsvFromFile(tempFile, fileName, options, processedBy);
  } finally {
    await fs.rm(tempFile, { force: true });
  }
}

/**
 * Ingest categories from CSV
 */
export async function ingestCategoriesCsv(
  buffer: Buffer,
  fileName: string,
  options: IngestionOptions = { mode: 'upsert' },
  processedBy?: number
): Promise<IngestionResult> {
  const db = getDatabase();
  const parsed = parseCsvBuffer(buffer, categoryCsvSchema);
  const errors = [...parsed.errors];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    const name = row.name.trim().toLowerCase();
    const slug = row.slug?.trim() || generateSlug(name);
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(or(eq(categories.name, name), eq(categories.slug, slug)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(categories).values({
        name,
        slug,
        description: row.description?.trim() || null,
      });
      inserted += 1;
      continue;
    }

    if (options.mode === 'insert') {
      skipped += 1;
      continue;
    }

    await db
      .update(categories)
      .set({
        name,
        slug,
        description: row.description?.trim() || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(categories.id, existing[0].id));
    updated += 1;
  }

  const importLogId = await createImportLog({
    fileName,
    recordType: 'categories',
    importMode: options.mode,
    overwriteStrategy: options.mode === 'insert' ? 'skip_duplicates' : 'update_existing',
    totalRows: parsed.summary.totalRows,
    successCount: inserted + updated,
    failureCount: errors.length,
    skippedCount: skipped,
    status: inserted + updated > 0 ? 'completed' : 'failed',
    errorReport: errors.length > 0 ? formatErrorReport(errors) : null,
    processedBy: processedBy ?? null,
  });

  return {
    success: inserted + updated > 0,
    importLogId,
    summary: {
      totalRows: parsed.summary.totalRows,
      inserted,
      updated,
      skipped,
      failed: errors.length,
    },
    errors,
    warnings: [],
  };
}

/**
 * Get import logs with pagination
 */
export async function getImportLogs(
  page: number = 1,
  limit: number = 20,
  filters?: {
    status?: string;
    recordType?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const db = getDatabase();
  const offset = (page - 1) * limit;

  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(importLogs.status, filters.status as 'processing' | 'completed' | 'failed'));
  }
  if (filters?.recordType) {
    conditions.push(eq(importLogs.recordType, filters.recordType));
  }
  if (filters?.dateFrom) {
    conditions.push(sql`${importLogs.createdAt} >= ${filters.dateFrom}`);
  }
  if (filters?.dateTo) {
    conditions.push(sql`${importLogs.createdAt} <= ${filters.dateTo}`);
  }

  const logs = await db
    .select()
    .from(importLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(importLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(importLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return {
    logs,
    pagination: {
      page,
      limit,
      total: total[0]?.count || 0,
      totalPages: Math.ceil((total[0]?.count || 0) / limit),
    },
  };
}

/**
 * Get detailed import log with error report
 */
export async function getImportLogDetails(logId: number) {
  const db = getDatabase();

  const log = await db
    .select()
    .from(importLogs)
    .where(eq(importLogs.id, logId))
    .limit(1);

  if (!log.length) {
    return null;
  }

  const errorReport = log[0].errorReport
    ? JSON.parse(log[0].errorReport)
    : null;

  return {
    ...log[0],
    errorReport,
  };
}

/**
 * Retry a failed import
 */
export async function retryImport(logId: number, buffer: Buffer): Promise<IngestionResult> {
  const db = getDatabase();

  const log = await db
    .select()
    .from(importLogs)
    .where(eq(importLogs.id, logId))
    .limit(1);

  if (!log.length) {
    throw new Error('Import log not found');
  }

  const originalLog = log[0];

  if (originalLog.recordType === 'products') {
    if (buffer.length > 0) {
      return ingestProductsCsv(buffer, originalLog.fileName, { mode: 'upsert', autoCreateCategories: true, batchSize: 250 });
    }

    if (!originalLog.sourceFilePath) {
      throw new Error('Retry requires a file upload because the original file path is unavailable');
    }

    return ingestProductsCsvFromFile(
      originalLog.sourceFilePath,
      originalLog.fileName,
      { mode: 'upsert', autoCreateCategories: true, batchSize: 250 },
      originalLog.processedBy ?? undefined
    );
  } else if (originalLog.recordType === 'categories') {
    if (buffer.length > 0) {
      return ingestCategoriesCsv(buffer, originalLog.fileName, { mode: 'upsert' });
    }

    if (!originalLog.sourceFilePath) {
      throw new Error('Retry requires a file upload because the original file path is unavailable');
    }

    const fileBuffer = await fs.readFile(originalLog.sourceFilePath);
    return ingestCategoriesCsv(fileBuffer, originalLog.fileName, { mode: 'upsert' });
  }

  throw new Error(`Unknown record type: ${originalLog.recordType}`);
}
