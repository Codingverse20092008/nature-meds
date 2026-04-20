import { getDatabase } from '../src/config/database.js';
import { products } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

const medicinesWithRealImages = [
  'atpent-dsr capsule',
  'acetis sp tablet',
  'amoxytis cv 625 tablet',
  'acetis r-sr capsule',
  'linezolid 600 tablet',
  'lulitis cream',
  'moxifloxacin 0.5 % eye drop',
  'neutrypsin br tablet',
  'oflotis-o tablet',
  'paracetamol o tablet',
  'rabeprazole sodium 20 mg tablet',
  'atpent-d tablet',
  'acetis-p oral suspension',
  'afdipovidone n ointment',
  'cetmon-l tablet',
  'ceffex az tablet',
  'drotapen-m tablet',
  'Trontis-MD 8',
  'Lectis 5',
  'Acetis CCP',
  'Atprox D 250',
  'Evitis Plus',
  'Clearmix-KT6 Ointment',
  'Clearmix-Plus Cream',
  'Betlan 8 mg',
  'Febusta-40',
  'Atortis-10',
  'LABETIS',
  'BILASTIS-20',
  'Acetis SR-200',
  'Cholecal 60K',
  'Solotis-16',
  'CaleGold Soap',
  'Zirotis-500',
  'Actotis Ear Drops',
  'ATWAX Ear Drops',
  'TERFITIS-250',
  'Dydrotis',
  'Atpent-HP Kit',
  'Tamlotis-D',
  'Rosutin-10',
  'Atzyme',
  'Esozo-DSR',
  'Zirotis-250',
  'Trontis-4',
];

async function markAsFeatured() {
  const db = getDatabase();
  
  console.log('Marking medicines with real images as featured...');
  
  let successCount = 0;
  let notFoundCount = 0;
  
  for (const medicineName of medicinesWithRealImages) {
    try {
      const result = await db
        .update(products)
        .set({ 
          isFeatured: true,
          updatedAt: new Date().toISOString()
        })
        .where(eq(products.name, medicineName))
        .returning();
      
      if (result.length > 0) {
        console.log(`✓ Marked as featured: ${medicineName}`);
        successCount++;
      } else {
        console.log(`✗ Not found in database: ${medicineName}`);
        notFoundCount++;
      }
    } catch (error) {
      console.error(`✗ Error updating ${medicineName}:`, error);
      notFoundCount++;
    }
  }
  
  console.log(`\nSummary:`);
  console.log(`- Successfully marked as featured: ${successCount}`);
  console.log(`- Not found in database: ${notFoundCount}`);
  
  process.exit(0);
}

markAsFeatured().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
