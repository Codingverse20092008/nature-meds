import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/PageHeader';
import { MedicineImage } from '../components/MedicineImage';
import { formatCurrencyINR, getCategoryLabel } from '../lib/catalog';
import { useCart, useCreateOrder } from '../lib/queries';
import { useDocumentMeta } from '../lib/meta';
import { useAuthStore } from '../store/authStore';

const SHIPPING_THRESHOLD = 299;
const SHIPPING_FEE = 20;

export function CheckoutPage() {
  const navigate = useNavigate();
  const cartQuery = useCart();
  const createOrder = useCreateOrder();
  const user = useAuthStore((state) => state.user);
  const cart = cartQuery.data;
  const subtotal = cart?.subtotal ?? 0;
  const shippingCost = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingCost;

  useDocumentMeta('Checkout', 'Confirm your delivery address, review your medicines, and place your COD order.');

  const hasAddress = Boolean(user?.address && user?.city && user?.state && user?.zipCode);

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Checkout"
        title="Review your delivery details and place your order"
        description="Cash on Delivery is available for all eligible orders. Free delivery on orders above Rs. 299."
      />

      {!cart || cart.items.length === 0 ? (
        <div className="card-shell rounded-[32px] px-8 py-16 text-center">
          <h2 className="text-2xl font-semibold text-ink-900">Your cart is empty</h2>
          <p className="mt-3 text-sm text-ink-500">Add medicines to your cart before continuing to checkout.</p>
          <Link to="/products" className="btn-primary mt-6">
            Browse medicines
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="card-shell rounded-[32px]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-ink-900">Delivery address</h2>
                  <p className="mt-2 text-sm text-ink-600">Orders are currently delivered within India only.</p>
                </div>
                <Link to="/profile" className="btn-secondary">
                  Edit profile
                </Link>
              </div>

              {hasAddress ? (
                <div className="mt-6 rounded-[26px] bg-surface-50 px-5 py-5 text-sm leading-7 text-ink-700">
                  <p className="font-semibold text-ink-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p>{user?.address}</p>
                  <p>
                    {user?.city}, {user?.state} {user?.zipCode}
                  </p>
                  <p>India</p>
                  <p className="mt-2">Primary phone: {user?.phone || 'Not added'}</p>
                  <p>Alternative phone: {user?.alternatePhone || 'Not added'}</p>
                </div>
              ) : (
                <div className="mt-6 rounded-[26px] border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-900">
                  Add your address, city, state, and PIN code in your profile before placing an order.
                </div>
              )}
            </section>

            <section className="card-shell rounded-[32px]">
              <h2 className="text-2xl font-semibold text-ink-900">Order summary</h2>
              <div className="mt-6 space-y-4">
                {cart.items.map((item) => (
                  <motion.div key={item.product.id} layout className="flex items-center gap-4 rounded-[24px] bg-surface-50 px-4 py-4">
                    <MedicineImage src={item.product.imageUrl} alt={item.product.name} className="size-16 rounded-[20px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">{item.product.name}</p>
                      <p className="text-sm text-ink-500">
                        {getCategoryLabel(item.product.category)} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-ink-900">{formatCurrencyINR(item.lineTotal)}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="card-shell rounded-[32px] bg-[linear-gradient(180deg,rgba(25,125,255,0.08),rgba(22,166,121,0.08))]">
              <h2 className="text-2xl font-semibold text-ink-900">Payment method</h2>
              <div className="mt-5 rounded-[24px] bg-white/80 px-5 py-5 text-sm text-ink-700">
                <p className="font-semibold text-ink-900">Cash on Delivery (COD)</p>
                <p className="mt-2">Payment status will remain pending until the order is delivered.</p>
              </div>
            </section>
          </div>

          <aside className="card-shell h-fit rounded-[32px]">
            <h3 className="text-xl font-semibold text-ink-900">Total payable</h3>
            <div className="mt-6 space-y-3 text-sm text-ink-600">
              <SummaryRow label="Items total" value={formatCurrencyINR(subtotal)} />
              <SummaryRow
                label="Shipping"
                value={shippingCost === 0 ? 'Free' : formatCurrencyINR(shippingCost)}
              />
              <p className="rounded-2xl bg-brand-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                Free delivery on orders above Rs. 299
              </p>
            </div>

            <div className="mt-6 rounded-[26px] bg-surface-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Final total</p>
              <p className="mt-2 text-3xl font-bold text-ink-900">{formatCurrencyINR(total)}</p>
            </div>

            <button
              type="button"
              className="btn-primary mt-6 w-full"
              disabled={!hasAddress || createOrder.isPending}
              onClick={async () => {
                try {
                  const order = await createOrder.mutateAsync({
                    items: cart.items.map((item) => ({
                      productId: item.product.id,
                      quantity: item.quantity,
                    })),
                    shippingAddress: user?.address ?? '',
                    shippingCity: user?.city ?? '',
                    shippingState: user?.state ?? '',
                    shippingZip: user?.zipCode ?? '',
                    paymentMethod: 'cod',
                  });
                  toast.success('Order placed successfully');
                  navigate('/order-success', {
                    state: {
                      orderNumber: order.orderNumber,
                    },
                  });
                } catch (error: unknown) {
                  const message =
                    error && typeof error === 'object' && 'response' in error
                      ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                      : 'Could not place order';
                  toast.error(message ?? 'Could not place order');
                }
              }}
            >
              {createOrder.isPending ? 'Placing order...' : 'Place Order'}
            </button>
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
