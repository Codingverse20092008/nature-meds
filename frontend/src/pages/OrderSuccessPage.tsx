import { Link, useLocation } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useDocumentMeta } from '../lib/meta';

export function OrderSuccessPage() {
  const location = useLocation();
  const orderNumber = (location.state as { orderNumber?: string } | null)?.orderNumber;

  useDocumentMeta('Order placed', 'Your Nature Meds order has been placed successfully.');

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Order success"
        title="Your order has been placed"
        description="We have received your COD order and will update your tracking status as it moves forward."
      />

      <div className="card-shell mx-auto max-w-2xl rounded-[32px] px-8 py-12 text-center">
        <p className="text-lg font-semibold text-brand-700">Order placed successfully</p>
        <h2 className="mt-3 text-3xl font-semibold text-ink-900">{orderNumber || 'Nature Meds Order'}</h2>
        <p className="mt-4 text-sm leading-7 text-ink-600">
          A confirmation email will be sent if email delivery is configured on the server. You can track this order from your orders page.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/orders" className="btn-primary">
            View orders
          </Link>
          <Link to="/products" className="btn-secondary">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
