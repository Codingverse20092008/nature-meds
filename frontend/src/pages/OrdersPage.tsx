import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { formatCurrencyINR } from '../lib/catalog';
import { useOrders } from '../lib/queries';
import { useDocumentMeta } from '../lib/meta';

function displayStatus(status: string) {
  return status === 'pending' ? 'Placed' : status.charAt(0).toUpperCase() + status.slice(1);
}

export function OrdersPage() {
  const ordersQuery = useOrders();
  useDocumentMeta('My orders', 'Track your Nature Meds orders and review past deliveries.');

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Orders"
        title="Your order history"
        description="View placed orders, delivery updates, and payment method details."
      />

      {ordersQuery.data && ordersQuery.data.length > 0 ? (
        <div className="space-y-4">
          {ordersQuery.data.map((order) => (
            <div key={order.id} className="card-shell rounded-[30px]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-lg font-semibold text-ink-900">{order.orderNumber}</p>
                  <p className="mt-1 text-sm text-ink-500">
                    {new Date(order.createdAt).toLocaleString()} · {displayStatus(order.status)}
                  </p>
                  <p className="mt-2 text-sm text-ink-700">
                    {order.items.length} item{order.items.length === 1 ? '' : 's'} · {formatCurrencyINR(order.total)}
                  </p>
                </div>
                <Link to={`/orders/${order.id}`} className="btn-secondary">
                  View details
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-shell rounded-[30px] px-8 py-14 text-center text-ink-500">
          No orders yet. Place your first medicine order from checkout.
        </div>
      )}
    </div>
  );
}
