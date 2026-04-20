import { getDatabase } from '../src/config/database.js';
import { products } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

const medicineUpdates = [
  {
    name: 'Evitis 400',
    genericName: 'Vitamin E 400 mg',
    description: 'Skin, hair, antioxidant, deficiency',
    form: 'Softgel',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Dydrotis',
    genericName: 'Dydrogesterone 10 mg',
    description: 'Hormonal imbalance, pregnancy support',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Atpent-HP Kit',
    genericName: 'Clarithromycin + Amoxicillin + Pantoprazole',
    description: 'H. pylori, gastric ulcer',
    form: 'Kit (tablet combo)',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Tamlotis-D',
    genericName: 'Tamsulosin + Dutasteride',
    description: 'Prostate enlargement (BPH)',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Rosutin-10',
    genericName: 'Rosuvastatin 10 mg',
    description: 'High cholesterol',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'drotapen-m tablet',
    genericName: 'Drotaverine + Mefenamic Acid',
    description: 'Period pain, abdominal cramps',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'atpent-d tablet',
    genericName: 'Pantoprazole + Domperidone',
    description: 'Acidity, GERD',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'ceffex az tablet',
    genericName: 'Cefixime + Azithromycin + Lactic Acid Bacillus',
    description: 'Bacterial infection',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'amoxytis cv 625 tablet',
    genericName: 'Amoxicillin + Clavulanate',
    description: 'Bacterial infection',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Atzyme',
    genericName: 'Digestive enzymes + B-complex + probiotics',
    description: 'Indigestion, poor digestion',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'neutrypsin br tablet',
    genericName: 'Trypsin + Bromelain + Rutoside + Aceclofenac',
    description: 'Swelling, injury pain',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Esozo-DSR',
    genericName: 'Esomeprazole + Domperidone SR',
    description: 'Acid reflux',
    form: 'Capsule',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'atpent-dsr capsule',
    genericName: 'Pantoprazole + Domperidone SR',
    description: 'Acidity, GERD',
    form: 'Capsule',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'cetmon-l tablet',
    genericName: 'Levocetirizine + Montelukast',
    description: 'Allergy, sneezing',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'rabeprazole sodium 20 mg tablet',
    genericName: 'Rabeprazole + Domperidone SR',
    description: 'Acid reflux',
    form: 'Capsule',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'oflotis-o tablet',
    genericName: 'Ofloxacin + Ornidazole',
    description: 'Intestinal infection',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'acetis-p oral suspension',
    genericName: 'Aceclofenac + Paracetamol',
    description: 'Pain, fever',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Zirotis-250',
    genericName: 'Azithromycin 250 mg',
    description: 'Bacterial infection',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Trontis-4',
    genericName: 'Ondansetron 4 mg',
    description: 'Vomiting, nausea',
    form: 'Tablet (MD)',
    dosage: 'As prescribed by physician',
  },
];

async function updateMedicineDetails() {
  const db = getDatabase();
  
  console.log('Updating medicine details (batch 3 - items 29-50)...');
  
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
