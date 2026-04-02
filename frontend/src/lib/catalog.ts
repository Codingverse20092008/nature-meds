const CATEGORY_LABELS: Record<string, string> = {
  anti: 'Antibiotics',
  anti_1: 'Antibiotics',
  antibiotics: 'Antibiotics',
  analgesics: 'Analgesics',
  blood: 'Blood Disorders',
  cardiac: 'Cardiac Care',
  derma: 'Dermatology',
  derma_1: 'Dermatology',
  dermatology: 'Dermatology',
  gastro: 'Gastroenterology',
  gastro_1: 'Gastroenterology',
  general: 'General Wellness',
  gynaecological: 'Gynecology',
  hormones: 'Hormonal Health',
  neuro: 'Neurology',
  neuro_1: 'Neurology',
  ophthal: 'Ophthalmology',
  others: 'General Wellness',
  otologicals: 'Ear Care',
  pain: 'Pain Relief',
  pain_1: 'Pain Relief',
  respiratory: 'Respiratory Care',
  sex: 'Sexual Wellness',
  stomatologicals: 'Oral Care',
  urology: 'Urology',
  vaccines: 'Vaccines & Immunization',
  vitamins: 'Vitamins & Supplements',
};

export function getCategoryLabel(category?: string | null) {
  if (!category) {
    return 'General Medicine';
  }

  const normalized = category.trim().toLowerCase().replace(/-/g, '_');
  return CATEGORY_LABELS[normalized] ?? category;
}

export function formatCurrencyINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}
