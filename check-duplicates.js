import { getDatabase } from './dist/config/database.js';
import { categories } from './dist/db/schema.js';

async function checkDuplicates() {
  try {
    const db = getDatabase();
    const allCategories = await db.select().from(categories);
    
    console.log('Total categories:', allCategories.length);
    console.log('\nAll categories:');
    allCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (ID: ${cat.id})`);
    });
    
    // Check for duplicates
    const nameMap = new Map();
    allCategories.forEach(cat => {
      const normalizedName = cat.name.toLowerCase().trim();
      if (nameMap.has(normalizedName)) {
        nameMap.get(normalizedName).push(cat);
      } else {
        nameMap.set(normalizedName, [cat]);
      }
    });
    
    console.log('\n🔍 Duplicate categories found:');
    let hasDuplicates = false;
    nameMap.forEach((cats, name) => {
      if (cats.length > 1) {
        hasDuplicates = true;
        console.log(`"${name}" appears ${cats.length} times:`);
        cats.forEach(cat => {
          console.log(`  - ID: ${cat.id}, Slug: ${cat.slug}`);
        });
      }
    });
    
    if (!hasDuplicates) {
      console.log('No duplicates found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDuplicates();
