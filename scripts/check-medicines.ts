import { getDatabase } from '../src/config/database.js';
import { products } from '../src/db/schema.js';
import { sql } from 'drizzle-orm';

async function checkMedicines() {
  const db = getDatabase();
  
  const result = await db
    .select({ name: products.name, imageUrl: products.imageUrl })
    .from(products)
    .where(sql`${products.imageUrl} IS NOT NULL AND ${products.imageUrl} != ''`)
    .limit(50);
  
  console.log('Medicines with images in database:');
  console.log(JSON.stringify(result, null, 2));
  
  process.exit(0);
}

checkMedicines().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
