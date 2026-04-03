import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import { getDatabase, closeDatabase } from '../config/database.js';
import { products, categories, type NewProduct } from '../db/schema.js';

const DEFAULT_BATCH_SIZE = 500;
const DEFAULT_FOLDER_PATH = path.join(process.cwd(), 'Medicine DB');

interface CsvRow {
  name?: string;
  genericName?: string;
  price?: string | number;
  stock?: string | number;
  category?: string;
  description?: string;
  manufacturer?: string;
  dosage?: string;
  form?: string;
  strength?: string;
  sku?: string;
  requiresPrescription?: string | boolean;
  [key: string]: unknown;
}

const generateSlug = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

async function run() {
  const args = process.argv.slice(2);
  const folderPath = args[0] || DEFAULT_FOLDER_PATH;
  const batchSize = Math.max(1, parseInt(args[1], 10) || DEFAULT_BATCH_SIZE);

  console.log('----------------------------------------------------');
  console.log('🚀 Automated Production CSV Import Started');
  console.log(`📂 Target Directory: ${folderPath}`);
  console.log(`📦 Batch Size: ${batchSize} rows/insert`);
  console.log('----------------------------------------------------\n');

  let db;
  try {
    db = getDatabase();
  } catch (error) {
    console.error('❌ Failed to connect to the Turso database:', error);
    process.exit(1);
  }

  // Pre-load categories to prevent redundant DB calls
  const existingCategories = await db.select().from(categories);
  const categoryMap = new Map<string, number>();
  for (const cat of existingCategories) {
    categoryMap.set(cat.name.toLowerCase(), cat.id);
  }

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    // Validate directory existence
    try {
      const stats = await fsPromises.stat(folderPath);
      if (!stats.isDirectory()) throw new Error('Not a directory');
    } catch {
      console.error(`❌ Folder not found or inaccessible: ${folderPath}`);
      console.log(`ℹ️  Please ensure you have a "Medicine DB" folder in the project root.`);
      process.exit(1);
    }

    const files = await fsPromises.readdir(folderPath);
    const csvFiles = files.filter((f) => f.toLowerCase().endsWith('.csv'));

    if (csvFiles.length === 0) {
      console.log('⚠️  No CSV files found in the specified directory.');
      return;
    }

    // Process each CSV file sequentially
    for (const file of csvFiles) {
      const filePath = path.join(folderPath, file);
      console.log(`📄 Processing stream for: ${file}...`);

      await new Promise<void>((resolve) => {
        let batch: NewProduct[] = [];
        let batchPromises: Promise<void>[] = [];
        // Dedup tracking within the file stream to prevent batch collision
        let seenSlugs = new Set<string>();

        const readStream = fs.createReadStream(filePath, 'utf-8');

        Papa.parse(readStream, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => {
            const clean = header.toLowerCase().trim();
            if (clean === 'medicine name' || clean === 'medicinename') return 'name';
            if (clean === 'generic name' || clean === 'genericname') return 'genericName';
            if (clean === 'category name') return 'category';
            if (clean === 'requires prescription' || clean === 'rx' || clean === 'prescription') return 'requiresPrescription';
            return clean;
          },
          step: function (results, parser) {
            const row = results.data as CsvRow;
            totalProcessed++;

            // Critical data validation
            if (!row.name || !row.price) {
              totalSkipped++;
              return;
            }

            const name = String(row.name).trim();
            const priceStr = String(row.price).replace(/[^0-9.]/g, '');
            const price = parseFloat(priceStr);

            if (isNaN(price)) {
              totalSkipped++;
              return;
            }

            // Async gap resolution: we pause the parser to allow async category creation if needed
            parser.pause();

            (async () => {
              try {
                let categoryId: number | undefined;
                if (row.category) {
                  const catName = String(row.category).trim();
                  const catKey = catName.toLowerCase();

                  if (categoryMap.has(catKey)) {
                    categoryId = categoryMap.get(catKey);
                  } else {
                    const catSlug = generateSlug(catName);
                    try {
                      // Insert new category immediately to maintain referential integrity
                      const [newCat] = await db
                        .insert(categories)
                        .values({ name: catName, slug: catSlug })
                        .onConflictDoNothing({ target: categories.slug })
                        .returning({ id: categories.id });

                      if (newCat) {
                        categoryId = newCat.id;
                        categoryMap.set(catKey, categoryId);
                      } else {
                        // Conflict resolved via do nothing - fetch the id
                        const existing = await db.query.categories.findFirst({
                          where: (categories, { eq }) => eq(categories.slug, catSlug)
                        });
                        if (existing) {
                          categoryId = existing.id;
                          categoryMap.set(catKey, categoryId);
                        }
                      }
                    } catch (err) {
                      console.warn(`  [Warn] Category creation failed for "${catName}"`);
                    }
                  }
                }

                let reqRx = false;
                if (row.requiresPrescription) {
                  const val = String(row.requiresPrescription).toLowerCase().trim();
                  reqRx = ['true', 'yes', '1', 'y', 'rx'].includes(val);
                }

                const uniqueSuffix = row.sku ? `-${generateSlug(String(row.sku))}` : '';
                const slug = generateSlug(name) + uniqueSuffix;

                // Prevent intra-batch unique constraint failures
                if (seenSlugs.has(slug)) {
                   totalSkipped++;
                   return;
                }
                seenSlugs.add(slug);

                const productData: NewProduct = {
                  name,
                  slug,
                  sku: row.sku ? String(row.sku).trim() : undefined,
                  genericName: row.genericName ? String(row.genericName).trim() : undefined,
                  categoryId,
                  description: row.description ? String(row.description).trim() : undefined,
                  price,
                  stock: row.stock ? parseInt(String(row.stock).replace(/[^0-9-]/g, ''), 10) || 0 : 0,
                  requiresPrescription: reqRx,
                  manufacturer: row.manufacturer ? String(row.manufacturer).trim() : undefined,
                  dosage: row.dosage ? String(row.dosage).trim() : undefined,
                  form: row.form ? String(row.form).trim() : undefined,
                  strength: row.strength ? String(row.strength).trim() : undefined,
                };

                batch.push(productData);

                // Run batch insert
                if (batch.length >= batchSize) {
                  const currentBatch = [...batch];
                  batch = [];
                  seenSlugs.clear(); // Safe to clear after batch leaves for DB processing
                  
                  const p = db.insert(products)
                    .values(currentBatch)
                    .onConflictDoNothing({ target: products.slug })
                    .then(() => {
                      totalInserted += currentBatch.length;
                      process.stdout.write(`\r  🔄 Processed batches: ${Math.floor(totalProcessed / batchSize)}`);
                    })
                    .catch(() => {
                      totalErrors += currentBatch.length;
                    });
                  batchPromises.push(p);
                }
              } finally {
                parser.resume();
              }
            })();
          },
          error: (err) => {
            console.error(`\n❌ Error parsing record in ${file}:`, err.message);
          },
          complete: () => {
            (async () => {
              // Wait for all outstanding full-batch promises
              await Promise.all(batchPromises);
              
              // Process any remainder batch
              if (batch.length > 0) {
                try {
                  await db.insert(products).values(batch).onConflictDoNothing({ target: products.slug });
                  totalInserted += batch.length;
                } catch (err) {
                  totalErrors += batch.length;
                }
              }
              console.log(`\n✅ Finished: ${file}`);
              resolve();
            })();
          }
        });
      });
    }

  } catch (error) {
    console.error('\n💥 Critical failure during import process:', error);
  } finally {
    console.log('\n====================================================');
    console.log('                   IMPORT SUMMARY                   ');
    console.log('====================================================');
    console.log(` 📊 Total Rows Read     : ${totalProcessed}`);
    console.log(` ✨ Successfully Insert : ${totalInserted}`);
    console.log(` ⏭️  Skipped / Invalid  : ${totalSkipped}`);
    console.log(` ⚠️  Errors / Collisions: ${totalErrors}`);
    console.log('====================================================\n');

    await closeDatabase();
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Unhandled runtime error:', err);
  process.exit(1);
});
