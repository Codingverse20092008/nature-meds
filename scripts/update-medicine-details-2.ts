import { getDatabase } from '../src/config/database.js';
import { products } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

const medicineUpdates = [
  {
    name: 'LABETIS',
    genericName: 'Labetalol 100 mg',
    description: 'High blood pressure (hypertension)',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'BILASTIS-20',
    genericName: 'Bilastine 20 mg',
    description: 'Allergy (sneezing, itching)',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Acetis SR-200',
    genericName: 'Aceclofenac SR 200 mg',
    description: 'Chronic pain, arthritis',
    form: 'Tablet (SR)',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Cholecal 60K',
    genericName: 'Vitamin D3 60,000 IU',
    description: 'Vitamin D deficiency, bone health',
    form: 'Granules/Sachet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'acetis r-sr capsule',
    genericName: 'Rabeprazole + Aceclofenac (SR)',
    description: 'Pain + acidity protection',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Solotis-16',
    genericName: 'Methylprednisolone 16 mg',
    description: 'Inflammation, allergy, autoimmune',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'CaleGold Soap',
    genericName: 'Herbal mix (Calendula, Aloe, etc.)',
    description: 'Skin care, mild infections',
    form: 'Soap',
    dosage: 'Use as directed for skin care',
  },
  {
    name: 'Zirotis-500',
    genericName: 'Azithromycin + Lactic Acid Bacillus',
    description: 'Bacterial infection',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Actotis Ear Drops',
    genericName: 'Beclomethasone + Clotrimazole + Gentamicin + Lignocaine',
    description: 'Ear infection + pain relief',
    form: 'Ear Drops',
    dosage: 'Apply as directed in ears',
  },
  {
    name: 'linezolid 600 tablet',
    genericName: 'Linezolid 600 mg',
    description: 'Serious bacterial infection',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'moxifloxacin 0.5 % eye drop',
    genericName: 'Moxifloxacin',
    description: 'Eye infection (bacterial)',
    form: 'Eye Drops',
    dosage: 'Apply as directed in eyes',
  },
  {
    name: 'ATWAX Ear Drops',
    genericName: 'Paradichlorobenzene + Benzocaine + Chlorbutol + Turpentine Oil',
    description: 'Ear wax removal + pain',
    form: 'Ear Drops',
    dosage: 'Apply as directed in ears',
  },
  {
    name: 'TERFITIS-250',
    genericName: 'Terbinafine 250 mg',
    description: 'Fungal infection (skin/nails)',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
];

async function updateMedicineDetails() {
  const db = getDatabase();
  
  console.log('Updating medicine details (batch 2)...');
  
  let successCount = 0;
  let notFoundCount = 0;
  
  for (const update of medicineUpdates) {
    try {
      const result = await db
        .update(products)
        .set({
          genericName: update.genericName,
          description: update.description,
          form: update.form,
          dosage: update.dosage,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.name, update.name))
        .returning();
      
      if (result.length > 0) {
        console.log(`✓ Updated: ${update.name}`);
        successCount++;
      } else {
        console.log(`✗ Not found: ${update.name}`);
        notFoundCount++;
      }
    } catch (error) {
      console.error(`✗ Error updating ${update.name}:`, error);
      notFoundCount++;
    }
  }
  
  console.log(`\nSummary:`);
  console.log(`- Successfully updated: ${successCount}`);
  console.log(`- Not found in database: ${notFoundCount}`);
  
  process.exit(0);
}

updateMedicineDetails().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
