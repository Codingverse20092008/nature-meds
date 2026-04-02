import { eq, inArray, sql } from 'drizzle-orm';
import { getDatabase } from '../config/database.js';
import { categories, products } from '../db/schema.js';

type CategoryRule = {
  aliases: string[];
  name: string;
  slug: string;
  description: string;
};

const CATEGORY_RULES: CategoryRule[] = [
  { aliases: ['anti', 'anti_1'], name: 'Antibiotics', slug: 'antibiotics', description: 'Antibiotic and anti-infective medicines.' },
  { aliases: ['gastro', 'gastro_1'], name: 'Gastroenterology', slug: 'gastroenterology', description: 'Digestive health and gastrointestinal medicines.' },
  { aliases: ['pain', 'pain_1'], name: 'Pain Relief', slug: 'pain-relief', description: 'Pain management and relief medicines.' },
  { aliases: ['analgesics'], name: 'Analgesics', slug: 'analgesics', description: 'Analgesic medicines for pain and fever management.' },
  { aliases: ['neuro', 'neuro_1'], name: 'Neurology', slug: 'neurology', description: 'Neurological and nervous system medicines.' },
  { aliases: ['derma', 'derma_1'], name: 'Dermatology', slug: 'dermatology', description: 'Skin care and dermatology medicines.' },
  { aliases: ['cardiac'], name: 'Cardiac Care', slug: 'cardiac-care', description: 'Heart and cardiovascular care medicines.' },
  { aliases: ['respiratory'], name: 'Respiratory Care', slug: 'respiratory-care', description: 'Respiratory and breathing support medicines.' },
  { aliases: ['blood'], name: 'Blood Disorders', slug: 'blood-disorders', description: 'Medicines for blood health and blood-related conditions.' },
  { aliases: ['urology'], name: 'Urology', slug: 'urology', description: 'Urology and urinary care medicines.' },
  { aliases: ['ophthal'], name: 'Ophthalmology', slug: 'ophthalmology', description: 'Eye care and ophthalmology medicines.' },
  { aliases: ['gynaecological'], name: 'Gynecology', slug: 'gynecology', description: 'Women’s health and gynecology medicines.' },
  { aliases: ['hormones'], name: 'Hormonal Health', slug: 'hormonal-health', description: 'Hormonal and endocrine medicines.' },
  { aliases: ['vitamins'], name: 'Vitamins & Supplements', slug: 'vitamins-supplements', description: 'Vitamins, supplements, and nutritional support.' },
  { aliases: ['sex'], name: 'Sexual Wellness', slug: 'sexual-wellness', description: 'Sexual wellness and intimate care medicines.' },
  { aliases: ['others', 'general'], name: 'General Wellness', slug: 'general-wellness', description: 'General health, wellness, and miscellaneous medicines.' },
  { aliases: ['otologicals'], name: 'Ear Care', slug: 'ear-care', description: 'Ear care and otological medicines.' },
  { aliases: ['stomatologicals'], name: 'Oral Care', slug: 'oral-care', description: 'Oral, mouth, and dental care medicines.' },
  { aliases: ['vaccines'], name: 'Vaccines & Immunization', slug: 'vaccines-immunization', description: 'Vaccines and immunization products.' },
];

async function main() {
  const db = getDatabase();
  const allCategories = await db.select().from(categories);

  for (const rule of CATEGORY_RULES) {
    const matches = allCategories.filter((category) => rule.aliases.includes(category.name.toLowerCase()));
    if (matches.length === 0) {
      continue;
    }

    const [canonical, ...duplicates] = matches.sort((left, right) => left.id - right.id);

    await db
      .update(categories)
      .set({
        name: rule.name,
        slug: rule.slug,
        description: rule.description,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(categories.id, canonical.id));

    if (duplicates.length > 0) {
      const duplicateIds = duplicates.map((category) => category.id);
      await db
        .update(products)
        .set({ categoryId: canonical.id })
        .where(inArray(products.categoryId, duplicateIds));

      await db.delete(categories).where(inArray(categories.id, duplicateIds));
    }

    console.log(`Normalized ${rule.aliases.join(', ')} -> ${rule.name}`);
  }

  const topStockProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(sql`${products.stock} desc`, products.name)
    .limit(12);

  await db.update(products).set({ isFeatured: false });

  if (topStockProducts.length > 0) {
    await db
      .update(products)
      .set({ isFeatured: true })
      .where(inArray(products.id, topStockProducts.map((product) => product.id)));
  }

  console.log(`Marked ${topStockProducts.length} products as featured.`);
}

main().catch((error) => {
  console.error('Failed to normalize categories:', error);
  process.exit(1);
});
