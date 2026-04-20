import { getDatabase } from '../src/config/database.js';
import { products } from '../src/db/schema.js';
import { like } from 'drizzle-orm';

async function searchEvitis() {
  const db = getDatabase();
  
  console.log('Searching for Evitis 400 or similar...');
  
  const result = await db
    .select({ name: products.name, imageUrl: products.imageUrl })
    .from(products)
    .where(like(products.name, '%evitis%'))
    .limit(10);
  
  console.log('Results:', JSON.stringify(result, null, 2));
  
  process.exit(0);
}

searchEvitis().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
