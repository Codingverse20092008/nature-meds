import { createReadStream } from 'node:fs';
import Papa from 'papaparse';
import { z } from 'zod';

export const productCsvSchema = z.object({
  sku: z.string().trim().optional().or(z.literal('')),
  name: z.string().trim().min(1, 'Product name is required'),
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().trim().optional().or(z.literal('')),
  price: z.string().trim().min(1, 'Price is required'),
  stock: z.string().trim().optional().or(z.literal('')),
  stockquantity: z.string().trim().optional().or(z.literal('')),
  requires_prescription: z.string().trim().optional().or(z.literal('')),
  prescriptionrequired: z.string().trim().optional().or(z.literal('')),
  expiry_date: z.string().trim().optional().or(z.literal('')),
  manufacturer: z.string().trim().optional().or(z.literal('')),
  dosage: z.string().trim().optional().or(z.literal('')),
  form: z.string().trim().optional().or(z.literal('')),
  strength: z.string().trim().optional().or(z.literal('')),
  image_url: z.string().trim().optional().or(z.literal('')),
  is_featured: z.string().trim().optional().or(z.literal('')),
  genericname: z.string().trim().optional().or(z.literal('')),
});

export const categoryCsvSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required'),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
  parent_category: z.string().trim().optional(),
});

export interface CsvParseResult<T> {
  data: T[];
  errors: CsvError[];
  summary: CsvSummary;
}

export interface ParsedProductRow {
  sku: string | null;
  name: string;
  slug: string;
  genericName: string | null;
  category: string;
  description: string | null;
  price: number;
  stock: number;
  requiresPrescription: boolean;
  expiryDate: string | null;
  manufacturer: string | null;
  dosage: string | null;
  form: string | null;
  strength: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
}

export interface CsvError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface CsvSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: string[];
}

export interface ParseOptions {
  hasHeader?: boolean;
  skipEmptyLines?: boolean;
  chunkSize?: number;
}

export interface StreamParseHandlers<T> {
  onValidRow?: (row: T, rowNumber: number) => Promise<void> | void;
}

function normalizeKey(input: string): string {
  return input.trim().toLowerCase();
}

function getStringField(row: Record<string, unknown>, key: string): string {
  const direct = row[key];
  if (typeof direct === 'string') {
    return direct.trim();
  }

  const foundKey = Object.keys(row).find((candidate) => normalizeKey(candidate) === normalizeKey(key));
  const value = foundKey ? row[foundKey] : undefined;
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBoolean(value: string): boolean {
  return ['true', 'yes', '1', 'y'].includes(value.trim().toLowerCase());
}

export function normalizeDate(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

/**
 * Parse CSV string into structured data
 */
export function parseCsvString<T extends z.ZodSchema>(
  csvContent: string,
  schema: T,
  options: ParseOptions = {}
): CsvParseResult<z.infer<T>> {
  const {
    hasHeader = true,
    skipEmptyLines = true,
  } = options;

  const errors: CsvError[] = [];
  const warnings: string[] = [];
  const validData: z.infer<T>[] = [];

  const parseResult = Papa.parse<string[]>(csvContent, {
    header: hasHeader,
    skipEmptyLines,
    dynamicTyping: false,
    transformHeader: (header: string) => header.toLowerCase().trim(),
  });

  if (!parseResult.data || parseResult.data.length === 0) {
    return {
      data: [],
      errors: [{ row: 0, field: 'file', value: '', message: 'CSV file is empty' }],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        warnings,
      },
    };
  }

  // Parse each row
  parseResult.data.forEach((row: any, index: number) => {
    const rowNum = hasHeader ? index + 2 : index + 1; // Account for header and 0-indexing

    try {
      const parsed = schema.parse(row);
      validData.push(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err) => {
          errors.push({
            row: rowNum,
            field: err.path.join('.') || 'unknown',
            value: row[err.path[0]] || '',
            message: err.message,
          });
        });
      } else {
        errors.push({
          row: rowNum,
          field: 'row',
          value: JSON.stringify(row),
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  });

  // Generate warnings for common issues
  validData.forEach((row: any, index) => {
    if (row.price <= 0) {
      warnings.push(`Row ${index + 1}: Price is zero or negative`);
    }
    if (row.stock < 0) {
      warnings.push(`Row ${index + 1}: Negative stock value`);
    }
    if (row.expiry_date) {
      const expiryDate = new Date(row.expiry_date);
      const now = new Date();
      if (expiryDate < now) {
        warnings.push(`Row ${index + 1}: Product has already expired (${row.expiry_date})`);
      } else if (expiryDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        warnings.push(`Row ${index + 1}: Product expires within 30 days (${row.expiry_date})`);
      }
    }
  });

  return {
    data: validData,
    errors,
    summary: {
      totalRows: parseResult.data.length,
      validRows: validData.length,
      invalidRows: errors.length,
      warnings,
    },
  };
}

/**
 * Parse CSV file from buffer (for uploaded files)
 */
export function parseCsvBuffer<T extends z.ZodSchema>(
  buffer: Buffer,
  schema: T,
  options: ParseOptions = {}
): CsvParseResult<z.infer<T>> {
  const csvContent = buffer.toString('utf-8');
  return parseCsvString(csvContent, schema, options);
}

export async function streamProcessCsv<T extends z.ZodTypeAny>(
  filePath: string,
  schema: T,
  handlers: StreamParseHandlers<z.infer<T>> = {}
): Promise<CsvParseResult<z.infer<T>>> {
  const errors: CsvError[] = [];
  const warnings: string[] = [];
  const validData: z.infer<T>[] = [];
  let totalRows = 0;

  await new Promise<void>((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(createReadStream(filePath), {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => normalizeKey(header),
      step: (results, parser) => {
        parser.pause();
        totalRows += 1;
        const rowNumber = totalRows + 1;
        const row = results.data;
        const parsed = schema.safeParse(row);

        const continueProcessing = async (): Promise<void> => {
          if (!parsed.success) {
            parsed.error.issues.forEach((issue) => {
              errors.push({
                row: rowNumber,
                field: issue.path.join('.') || 'unknown',
                value: String(row[String(issue.path[0] ?? '')] ?? ''),
                message: issue.message,
              });
            });
            parser.resume();
            return;
          }

          validData.push(parsed.data);
          await handlers.onValidRow?.(parsed.data, rowNumber);
          parser.resume();
        };

        continueProcessing().catch(reject);
      },
      complete: () => resolve(),
      error: reject,
    });
  });

  return {
    data: validData,
    errors,
    summary: {
      totalRows,
      validRows: validData.length,
      invalidRows: errors.length,
      warnings,
    },
  };
}

export function normalizeProductData(data: Record<string, unknown>): ParsedProductRow {
  const rawPrice = getStringField(data, 'price');
  const rawStock = getStringField(data, 'stock') || getStringField(data, 'stockQuantity');
  const rawExpiry = getStringField(data, 'expiry_date');
  const price = Number.parseFloat(rawPrice);
  const stock = rawStock ? Number.parseInt(rawStock, 10) : 0;
  const expiryDate = normalizeDate(rawExpiry);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Price must be a positive number');
  }

  if (!Number.isFinite(stock) || stock < 0) {
    throw new Error('Stock must be a non-negative integer');
  }

  if (rawExpiry && !expiryDate) {
    throw new Error('Expiry date must be a valid date');
  }

  if (expiryDate && isProductExpired(expiryDate)) {
    throw new Error(`Product is expired (${expiryDate})`);
  }

  const imageUrl = getStringField(data, 'image_url');
  if (imageUrl) {
    try {
      new URL(imageUrl);
    } catch {
      throw new Error('Image URL must be a valid URL');
    }
  }

  return {
    sku: getStringField(data, 'sku') || null,
    name: getStringField(data, 'name'),
    slug: generateSlug(getStringField(data, 'name')),
    genericName: getStringField(data, 'genericName') || null,
    category: (getStringField(data, 'category') || 'uncategorized').toLowerCase(),
    description: getStringField(data, 'description') || null,
    price: Number(price.toFixed(2)),
    stock,
    requiresPrescription: normalizeBoolean(
      getStringField(data, 'requires_prescription') || getStringField(data, 'prescriptionRequired')
    ),
    expiryDate,
    manufacturer: getStringField(data, 'manufacturer') || null,
    dosage: getStringField(data, 'dosage') || null,
    form: getStringField(data, 'form') || null,
    strength: getStringField(data, 'strength') || getStringField(data, 'dosage') || null,
    imageUrl: imageUrl || null,
    isFeatured: normalizeBoolean(getStringField(data, 'is_featured')),
  };
}

/**
 * Generate URL-friendly slug from string
 */
export function generateSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format error report as JSON string for storage
 */
export function formatErrorReport(errors: CsvError[]): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalErrors: errors.length,
      errors: errors.map((err) => ({
        ...err,
        timestamp: new Date().toISOString(),
      })),
    },
    null,
    2
  );
}

/**
 * Validate date string format
 */
export function isValidDate(dateString: string): boolean {
  if (!dateString) return true; // Empty is valid (optional field)
  return normalizeDate(dateString) !== null;
}

/**
 * Check if product is expired
 */
export function isProductExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  return expiry < new Date();
}
