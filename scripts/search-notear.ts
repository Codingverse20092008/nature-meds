import { getDatabase } from '../src/config/database.js';
import { products } from '../src/db/schema.js';
import { like } from 'drizzle-orm';

async function searchNotear() {
  const db = getDatabase();
  
  console.log('Searching for NOTEAR or similar eye drops...');
  
  const result = await db
    .select({ name: products.name, imageUrl: products.imageUrl })
    .from(products)
    .where(like(products.name, '%notear%'))
    .limit(10);
  
  console.log('Results:', JSON.stringify(result, null, 2));
  
  // Also search for eye drops
  const eyeDrops = await db
    .select({ name: products.name, imageUrl: products.imageUrl })
    .from(products)
    .where(like(products.name, '%eye drop%'))
    .limit(10);
  
  console.log('\nAll eye drops:', JSON.stringify(eyeDrops, null, 2));
  
  process.exit(0);
}

searchNotear().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
