#!/usr/bin/env node
/**
 * Bulk Medicine Import Script
 *
 * Usage:
 *   npm run import:medicines [directory]
 *
 * Examples:
 *   npm run import:medicines                     # Uses default Medicine DB folder
 *   npm run import:medicines ./custom/path       # Uses custom directory
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { quickImportMedicines, bulkImportMedicines } from '../services/bulk-medicine-import.js';
import { getDatabase } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default medicine directory
const DEFAULT_MEDICINE_DIR = join(__dirname, '../../Medicine DB');

async function main() {
  const args = process.argv.slice(2);
  const medicineDir = args[0] || DEFAULT_MEDICINE_DIR;

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║        🌿 Nature Meds - Bulk Medicine Import              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Validate directory
  if (!existsSync(medicineDir)) {
    console.error(`❌ Error: Directory not found: ${medicineDir}`);
    console.error('\nUsage: npm run import:medicines [directory]');
    console.error('\nDefault directory: ./Medicine DB');
    process.exit(1);
  }

  console.log(`📂 Importing medicines from: ${medicineDir}\n`);

  try {
    // Initialize database
    console.log('🔗 Connecting to database...');
    getDatabase();
    console.log('✅ Database connected\n');

    // Check if user wants quick import or streaming import
    console.log('Select import mode:');
    console.log('  1. Quick Import (faster, uses direct SQL)');
    console.log('  2. Streaming Import (slower, more error handling)');
    console.log('');

    // For automated runs, default to quick import
    const mode = args[1] === '--stream' ? 'stream' : 'quick';

    if (mode === 'quick') {
      console.log('🚀 Using Quick Import mode...\n');

      let lastProgress = 0;
      const result = await quickImportMedicines(medicineDir, (progress) => {
        const percentage = Math.round((progress.count / 10000) * 100) % 100;
        if (percentage !== lastProgress) {
          console.log(`  📦 ${progress.file}: ${progress.count} records`);
          lastProgress = percentage;
        }
      });

      printResults(result);
    } else {
      console.log('🐢 Using Streaming Import mode...\n');

      let lastProgress = 0;
      const result = await bulkImportMedicines(medicineDir, {
        batchSize: 500,
        autoCreateCategories: true,
        onProgress: (progress) => {
          if (progress.percentage !== lastProgress) {
            console.log(`  📊 Progress: ${progress.percentage}% (${progress.filesProcessed}/${progress.totalFiles} files)`);
            console.log(`     Inserted: ${progress.inserted}, Updated: ${progress.updated}, Failed: ${progress.failed}\n`);
            lastProgress = progress.percentage;
          }
        },
      });

      printResults(result);
    }
  } catch (error) {
    console.error('\n❌ Import failed:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function printResults(result: Awaited<ReturnType<typeof quickImportMedicines>>) {
  const durationSeconds = (result.duration / 1000).toFixed(2);
  const recordsPerSecond = Math.round(result.totalProcessed / (result.duration / 1000));

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                  Import Results                           ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Total Processed: ${result.totalProcessed.toLocaleString().padEnd(35)}║`);
  console.log(`║  ✅ Inserted:     ${result.inserted.toLocaleString().padEnd(35)}║`);
  console.log(`║  🔄 Updated:      ${result.updated.toLocaleString().padEnd(35)}║`);
  console.log(`║  ❌ Failed:       ${result.failed.toLocaleString().padEnd(35)}║`);
  console.log(`║  ⏭️  Skipped:      ${result.skipped.toLocaleString().padEnd(35)}║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Duration:        ${durationSeconds.padEnd(35)}║`);
  console.log(`║  Speed:           ${recordsPerSecond.toLocaleString()} records/sec`.padEnd(54) + '║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (result.errors.length > 0) {
    console.log(`⚠️  ${result.errors.length} errors occurred during import:\n`);
    result.errors.slice(0, 10).forEach((err) => {
      console.log(`  - Row ${err.row} in ${err.file}: ${err.message}`);
    });
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more errors`);
    }
    console.log('');
  }

  if (result.success) {
    console.log('✅ Import completed successfully!\n');
  } else {
    console.log('⚠️  Import completed with errors\n');
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
