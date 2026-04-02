import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Factory, ShieldAlert, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { MedicineImage } from '../components/MedicineImage';
import { PageHeader } from '../components/PageHeader';
import { formatCurrencyINR, getCategoryLabel } from '../lib/catalog';
import { useAddToCart, useProduct } from '../lib/queries';
import { useDocumentMeta } from '../lib/meta';

export function ProductDetailsPage() {
  const { productId } = useParams();
  const { data: product, isLoading, isError } = useProduct(productId);
  const addToCart = useAddToCart();
  useDocumentMeta(product?.name ?? 'Product details', 'Detailed pharmacy product information with stock, expiry, and prescription requirements.');

  if (isLoading) {
    return (
      <div className="section-shell">
        <div className="card-shell grid gap-8 lg:grid-cols-2">
          <div className="skeleton h-[320px] rounded-[28px]" />
          <div className="space-y-4">
            <div className="skeleton h-8 w-2/3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-14 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="section-shell">
        <div className="card-shell rounded-[30px] px-8 py-16 text-center text-ink-500">The requested medicine could not be loaded.</div>
      </div>
    );
  }

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow={getCategoryLabel(product.category)}
        title={product.name}
        description={product.description ?? 'Detailed medicine information from your live pharmacy product record.'}
      />

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          className="card-shell flex min-h-[360px] items-center justify-center rounded-[34px] bg-[linear-gradient(180deg,rgba(25,125,255,0.08),rgba(22,166,121,0.08))]"
        >
          <MedicineImage src={product.imageUrl} alt={product.name} className="flex size-52 items-center justify-center rounded-[40px] shadow-[0_20px_50px_rgba(25,125,255,0.12)]" />
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="card-shell rounded-[30px]">
            <div className="mb-5 flex flex-wrap gap-3">
              <span className="badge-pill">{getCategoryLabel(product.category)}</span>
              {product.requiresPrescription && (
                <span className="badge-pill border-amber-200 bg-amber-50/80 text-amber-700">
                  <ShieldAlert size={14} />
                  Prescription required
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Price" value={formatCurrencyINR(product.price)} />
              <Info label="Stock" value={`${product.stock} units`} />
              <Info label="Manufacturer" value={product.manufacturer ?? 'Verified supplier'} icon={<Factory size={15} />} />
              <Info label="Expiry" value={product.expiryDate ?? 'Not listed'} icon={<CalendarClock size={15} />} />
              <Info label="Dosage" value={product.dosage ?? 'Consult pharmacist'} />
              <Info label="Form" value={product.form ?? 'Standard'} />
            </div>

            <button
              type="button"
              className="btn-primary mt-6 w-full sm:w-auto"
              onClick={async () => {
                await addToCart.mutateAsync({ product, quantity: 1 });
                toast.success(`${product.name} added to cart`);
              }}
            >
              <ShoppingCart size={16} />
              Add to cart
            </button>
          </div>

          <div className="card-shell rounded-[30px]">
            <h3 className="text-lg font-semibold text-ink-900">Safety and fulfillment notes</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-ink-600">
              <li>Expiry is shown from the live inventory record imported through your CSV pipeline.</li>
              <li>Prescription requirements are surfaced visually before cart actions to reduce ordering mistakes.</li>
              <li>Current stock is fetched from the backend and reflects available pharmacy inventory.</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-[24px] bg-surface-50 px-4 py-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
        {icon}
        {label}
      </p>
      <p className="text-base font-semibold text-ink-900">{value}</p>
    </div>
  );
}
