import { getDatabase } from './dist/config/database.js';
import { categories, products } from './dist/db/schema.js';
import { eq } from 'drizzle-orm';

async function fixDuplicateCategories() {
  try {
    const db = getDatabase();
    const allCategories = await db.select().from(categories);
    
    // Find categories with similar names (remove suffixes)
    const categoryMap = new Map();
    
    allCategories.forEach(cat => {
      const baseName = cat.name.replace(/_\d+$/, '').toLowerCase();
      if (categoryMap.has(baseName)) {
        categoryMap.get(baseName).push(cat);
      } else {
        categoryMap.set(baseName, [cat]);
      }
    });
    
    console.log('🔧 Fixing duplicate categories...\n');
    
    for (const [baseName, cats] of categoryMap) {
      if (cats.length > 1) {
        console.log(`Fixing "${baseName}" - found ${cats.length} duplicates`);
        
        // Keep the first one (lowest ID), merge others into it
        const primaryCategory = cats.reduce((prev, current) => 
          prev.id < current.id ? prev : current
        );
        
        const duplicates = cats.filter(cat => cat.id !== primaryCategory.id);
        
        for (const duplicate of duplicates) {
          console.log(`  - Moving products from category ${duplicate.id} to ${primaryCategory.id}`);
          
          // Update products to use the primary category
          await db
            .update(products)
            .set({ categoryId: primaryCategory.id })
            .where(eq(products.categoryId, duplicate.id));
          
          // Delete the duplicate category
          await db
            .delete(categories)
            .where(eq(categories.id, duplicate.id));
        }
      }
    }
    
    console.log('\n✅ Fixed duplicate categories!');
    
    // Show remaining categories
    const remainingCategories = await db.select().from(categories);
    console.log(`\nRemaining categories: ${remainingCategories.length}`);
    remainingCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (ID: ${cat.id})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDuplicateCategories();
