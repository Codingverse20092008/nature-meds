import { useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/PageHeader';
import { formatCurrencyINR } from '../lib/catalog';
import { useOrder, useCancelOrder } from '../lib/queries';
import { useDocumentMeta } from '../lib/meta';

const steps = ['placed', 'confirmed', 'shipped', 'delivered'];

const CANCEL_REASONS = [
  { value: 'ordered_by_mistake', label: 'Ordered by mistake' },
  { value: 'found_cheaper', label: 'Found cheaper elsewhere' },
  { value: 'delivery_delay', label: 'Delay in delivery' },
  { value: 'no_longer_needed', label: 'No longer needed' },
  { value: 'other', label: 'Other' },
];

function normalizeStatus(status: string) {
  return status === 'pending' ? 'placed' : status;
}

export function OrderDetailsPage() {
  const { orderId } = useParams();
  const orderQuery = useOrder(orderId);
  const order = orderQuery.data;
  const cancelOrder = useCancelOrder();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  useDocumentMeta('Order details', 'Track your medicine order, address, and delivery progress.');

  const canCancel = order && ['placed', 'confirmed', 'pending'].includes(order.status);

  const isCancelRequested = order?.status === 'cancel_requested';
  const isCancelled = order?.status === 'cancelled';

  const handleCancel = async () => {
    if (!selectedReason) {
      toast.error('Please select a reason for cancellation');
      return;
    }
    try {
      await cancelOrder.mutateAsync({ orderId: order!.id, reason: selectedReason });
      toast.success('Cancellation request submitted successfully');
      setShowCancelModal(false);
    } catch {
      toast.error('Failed to submit cancellation request');
    }
  };

  if (!order) {
    return (
      <div className="section-shell">
        <div className="card-shell rounded-[30px] px-8 py-16 text-center text-ink-500">Loading order details...</div>
      </div>
    );
  }

  const activeStep = steps.indexOf(normalizeStatus(order.status));

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Order details"
        title={`Track ${order.orderNumber}`}
        description="Follow your order timeline, delivery address, and payment details."
      />

      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card-shell rounded-[30px]">
            <h2 className="text-2xl font-semibold text-ink-900">Tracking timeline</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {steps.map((step, index) => {
                const complete = index <= activeStep;
                return (
                  <div
                    key={step}
                    className={`rounded-[24px] px-4 py-4 text-sm font-semibold ${complete ? 'bg-brand-50 text-brand-700' : 'bg-surface-50 text-ink-500'}`}
                  >
                    {step === 'placed' ? 'Order placed' : step.charAt(0).toUpperCase() + step.slice(1)}
                    {complete ? ' ✓' : ''}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card-shell rounded-[30px]">
            <h2 className="text-2xl font-semibold text-ink-900">Items</h2>
            <div className="mt-6 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-[24px] bg-surface-50 px-4 py-4 text-sm">
                  <p className="font-semibold text-ink-900">{item.productName}</p>
                  <p className="mt-1 text-ink-500">
                    Qty {item.quantity} · {formatCurrencyINR(item.totalPrice)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card-shell rounded-[30px]">
            <h3 className="text-xl font-semibold text-ink-900">Delivery address</h3>
            <div className="mt-4 text-sm leading-7 text-ink-700">
              <p>{order.shippingAddress}</p>
              <p>
                {order.shippingCity}, {order.shippingState} {order.shippingZip}
              </p>
              <p>{order.shippingCountry || 'India'}</p>
            </div>
          </section>

          <section className="card-shell rounded-[30px]">
            <h3 className="text-xl font-semibold text-ink-900">Payment</h3>
            <div className="mt-4 space-y-3 text-sm text-ink-700">
              <p>Method: <span className="font-semibold text-ink-900">Cash on Delivery</span></p>
              <p>Status: <span className="font-semibold text-ink-900">{order.paymentStatus}</span></p>
              <p>Total: <span className="font-semibold text-ink-900">{formatCurrencyINR(order.total)}</span></p>
            </div>
            {canCancel && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="btn-secondary mt-4 w-full border-red-200 text-red-600 hover:bg-red-50"
              >
                Request Cancellation
              </button>
            )}
            {isCancelRequested && (
              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <p className="font-semibold">Cancellation Request Pending</p>
                <p className="mt-1">Your cancellation request is awaiting admin approval.</p>
                {order.cancellationReason && <p className="mt-1">Reason: {order.cancellationReason}</p>}
              </div>
            )}
            {isCancelled && (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                <p className="font-semibold">Order Cancelled</p>
                {order.cancellationReason && <p className="mt-1">Reason: {order.cancellationReason}</p>}
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 px-4">
          <div className="card-shell max-w-md rounded-[32px] p-6">
            <h3 className="text-xl font-semibold text-ink-900">Cancel Order</h3>
            <p className="mt-2 text-sm text-ink-500">Please select a reason for cancellation:</p>
            <div className="mt-4 space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason.value}
                  type="button"
                  onClick={() => setSelectedReason(reason.value)}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition-colors ${
                    selectedReason === reason.value
                      ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-200'
                      : 'bg-surface-50 text-ink-700 hover:bg-surface-100'
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn-secondary flex-1"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelOrder.isPending}
                className="btn-primary flex-1 bg-red-500 hover:bg-red-600"
              >
                {cancelOrder.isPending ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
