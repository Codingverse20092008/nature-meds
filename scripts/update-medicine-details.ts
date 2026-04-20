import { getDatabase } from '../src/config/database.js';
import { products } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

const medicineUpdates = [
  {
    name: 'acetis sp tablet',
    genericName: 'Aceclofenac + Paracetamol + Serratiopeptidase',
    description: 'Pain, inflammation, swelling (injury, surgery)',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Trontis-MD 8',
    genericName: 'Ondansetron 8 mg',
    description: 'Vomiting, nausea',
    form: 'Mouth Dissolving Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Lectis 5',
    genericName: 'Levocetirizine 5 mg',
    description: 'Allergy, sneezing',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Acetis CCP',
    genericName: 'Aceclofenac + Paracetamol + Phenylephrine + Cetirizine + Caffeine',
    description: 'Cold + pain + fever combo',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Atprox D 250',
    genericName: 'Domperidone + Naproxen',
    description: 'Migraine, pain + nausea',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Evitis Plus',
    genericName: 'Omega-3 + Wheat Germ Oil + Vitamin E',
    description: 'Weakness, nutrition, skin/hair',
    form: 'Softgel',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'lulitis cream',
    genericName: 'Luliconazole 1%',
    description: 'Fungal skin infection',
    form: 'Cream',
    dosage: 'Apply topically as directed',
  },
  {
    name: 'Clearmix-KT6 Ointment',
    genericName: 'Ketoconazole + Iodochlorhydroxyquinoline + Tolnaftate + Neomycin + Clobetasol + Dexpanthenol',
    description: 'Mixed skin infection (fungal + bacterial + inflammation)',
    form: 'Ointment',
    dosage: 'Apply topically as directed',
  },
  {
    name: 'Clearmix-Plus Cream',
    genericName: 'Itraconazole + Ofloxacin + Ornidazole + Clobetasol',
    description: 'Severe skin infection (fungal + bacterial)',
    form: 'Cream',
    dosage: 'Apply topically as directed',
  },
  {
    name: 'paracetamol o tablet',
    genericName: 'Paracetamol + Diclofenac + Chlorzoxazone',
    description: 'Muscle pain, spasm',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'afdipovidone n ointment',
    genericName: 'Povidone Iodine',
    description: 'Wound antiseptic',
    form: 'Ointment',
    dosage: 'Apply topically as directed',
  },
  {
    name: 'Betlan 8 mg',
    genericName: 'Betahistine',
    description: 'Vertigo, dizziness',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Febusta-40',
    genericName: 'Febuxostat 40 mg',
    description: 'Uric acid (gout) control',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
  {
    name: 'Atortis-10',
    genericName: 'Atorvastatin 10 mg',
    description: 'Cholesterol control',
    form: 'Tablet',
    dosage: 'As prescribed by physician',
  },
];

async function updateMedicineDetails() {
  const db = getDatabase();
  
  console.log('Updating medicine details...');
  
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
