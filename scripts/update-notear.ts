import { getDatabase } from '../src/config/database.js';
import { products } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function updateNotear() {
  const db = getDatabase();
  
  console.log('Updating NOTEAR Eye Drops...');
  
  try {
    const result = await db
      .update(products)
      .set({
        genericName: 'Carboxymethyl Cellulose',
        description: 'Dry eyes (lubrication)',
        form: 'Eye Drops',
        dosage: 'Apply as directed in eyes',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(products.name, 'notear eye drop'))
      .returning();
    
    if (result.length > 0) {
      console.log(`✓ Updated: NOTEAR Eye Drops`);
    } else {
      console.log(`✗ Not found: NOTEAR Eye Drops`);
    }
  } catch (error) {
    console.error(`✗ Error updating NOTEAR Eye Drops:`, error);
  }
  
  process.exit(0);
}

updateNotear().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
