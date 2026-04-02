import { motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MedicineImage } from '../components/MedicineImage';
import { PageHeader } from '../components/PageHeader';
import { formatCurrencyINR, getCategoryLabel } from '../lib/catalog';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '../lib/queries';
import { useDocumentMeta } from '../lib/meta';
import { useAuthStore } from '../store/authStore';
import { useGuestCartStore } from '../store/guestCartStore';

export function CartPage() {
  const token = useAuthStore((state) => state.token);
  const guestItems = useGuestCartStore((state) => state.items);
  const guestUpdateQuantity = useGuestCartStore((state) => state.updateQuantity);
  const guestRemoveItem = useGuestCartStore((state) => state.removeItem);
  const cartQuery = useCart();
  const updateCart = useUpdateCartItem();
  const removeCart = useRemoveCartItem();
  useDocumentMeta('Cart', 'Review and update your selected medicines before checkout.');

  const items = token
    ? (cartQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        product: item.product,
      }))
    : guestItems.map((item) => ({
        id: item.product.id,
        quantity: item.quantity,
        lineTotal: item.product.price * item.quantity,
        product: item.product,
      }));
  const subtotal = token ? (cartQuery.data?.subtotal ?? 0) : items.reduce((total, item) => total + item.lineTotal, 0);
  const shippingCost = subtotal >= 299 ? 0 : 20;

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Cart"
        title="Review and adjust your selected medicines."
        description="Update your selected medicines before checkout."
      />

      {items.length === 0 ? (
        <div className="card-shell rounded-[32px] px-8 py-16 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <ShoppingBag size={26} />
          </div>
          <h3 className="text-2xl font-semibold text-ink-900">Your cart is empty</h3>
          <p className="mt-3 text-sm text-ink-500">Browse the product catalog to add medicines to your order.</p>
          <Link to="/products" className="btn-primary mt-6">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {items.map((item) => (
              <motion.div key={item.product.id} layout className="card-shell flex flex-col gap-4 rounded-[30px] md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <MedicineImage src={item.product.imageUrl} alt={item.product.name} className="size-18 rounded-[24px]" />
                  <div>
                    <p className="text-lg font-semibold text-ink-900">{item.product.name}</p>
                    <p className="mt-1 text-sm text-ink-500">{getCategoryLabel(item.product.category)} · {formatCurrencyINR(item.product.price)} each</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-surface-50 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => token ? updateCart.mutate({ productId: item.product.id, quantity: item.quantity - 1 }) : guestUpdateQuantity(item.product.id, item.quantity - 1)}
                      className="rounded-xl p-1 text-ink-700 hover:bg-white"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => token ? updateCart.mutate({ productId: item.product.id, quantity: item.quantity + 1 }) : guestUpdateQuantity(item.product.id, item.quantity + 1)}
                      className="rounded-xl p-1 text-ink-700 hover:bg-white"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <p className="min-w-20 text-right text-lg font-semibold text-ink-900">{formatCurrencyINR(item.lineTotal)}</p>
                  <button
                    type="button"
                    onClick={() => token ? removeCart.mutate(item.product.id) : guestRemoveItem(item.product.id)}
                    className="rounded-2xl border border-red-100 bg-red-50 p-3 text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          <aside className="card-shell h-fit rounded-[30px]">
            <h3 className="text-xl font-semibold text-ink-900">Order summary</h3>
            <div className="mt-6 space-y-3 text-sm text-ink-600">
              <SummaryRow label="Items" value={String(items.reduce((total, item) => total + item.quantity, 0))} />
              <SummaryRow label="Estimated subtotal" value={formatCurrencyINR(subtotal)} />
              <SummaryRow label="Estimated shipping" value={shippingCost === 0 ? 'Free' : formatCurrencyINR(shippingCost)} />
            </div>
            <div className="mt-6 rounded-[24px] bg-brand-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Estimated total</p>
              <p className="mt-2 text-3xl font-bold text-ink-900">{formatCurrencyINR(subtotal + shippingCost)}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Free delivery on orders above Rs. 299</p>
            </div>
            <Link
              to={token ? '/checkout' : '/auth'}
              state={token ? undefined : { redirectTo: '/checkout' }}
              className="btn-primary mt-6 w-full"
            >
              {token ? 'Proceed to checkout' : 'Login to continue'}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}
