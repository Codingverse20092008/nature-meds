import { Package, Search, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { TableSkeleton } from '../components/Skeletons';
import { formatCurrencyINR } from '../lib/catalog';
import { useLowStockProducts, useUpdateStock, useProducts } from '../lib/queries';
import { useDocumentMeta } from '../lib/meta';
import { useAuthStore } from '../store/authStore';

export function AdminStockPage() {
  const { user, token } = useAuthStore();
  const [threshold, setThreshold] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const lowStock = useLowStockProducts(threshold);
  const updateStock = useUpdateStock();
  const allProducts = useProducts({ limit: 100 });

  useDocumentMeta('Stock Management', 'Monitor inventory levels, update product stock, and manage low-stock alerts.');

  if (!token || !user) return <Navigate to="/auth" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  const handleUpdate = async (productId: number) => {
    try {
      await updateStock.mutateAsync({ productId, stock: editValue });
      toast.success('Stock updated successfully');
      setEditingId(null);
    } catch {
      toast.error('Failed to update stock');
    }
  };

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Inventory Control"
        title="Stock Management System"
        description="Monitor real-time inventory levels, adjust stock counts, and handle low-stock warnings across your pharmacy catalog."
      />

      <div className="grid gap-8 xl:grid-cols-[1fr_350px]">
        <section className="space-y-8">
          <div className="card-shell rounded-[34px]">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-semibold text-ink-900">All Products</h3>
              <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-2 text-sm text-ink-500 shadow-soft">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Filter inventory..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent outline-none"
                />
              </div>
            </div>

            {allProducts.isLoading ? (
              <TableSkeleton />
            ) : (
              <div className="overflow-hidden rounded-[26px] border border-surface-100 bg-surface-50">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/80 text-xs uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Product</th>
                      <th className="px-6 py-4 font-semibold text-center">Price</th>
                      <th className="px-6 py-4 font-semibold text-center">Current Stock</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {allProducts.data?.data
                      ?.filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((product) => (
                      <tr key={product.id} className="group transition hover:bg-white/60">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-ink-900">{product.name}</p>
                          <p className="text-xs text-ink-500">{product.sku || 'No SKU'}</p>
                        </td>
                        <td className="px-6 py-4 text-center text-ink-700">
                          {formatCurrencyINR(product.price)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {editingId === product.id ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(Number(e.target.value))}
                              className="w-20 rounded-xl border border-brand-200 bg-white px-3 py-1 text-center font-bold text-brand-600 outline-none ring-brand-100 focus:ring-4"
                              autoFocus
                            />
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold ${
                              product.stock <= 0 ? 'bg-red-50 text-red-600' : 
                              product.stock < threshold ? 'bg-amber-50 text-amber-600' :
                              'bg-green-50 text-green-600'
                            }`}>
                              {product.stock}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {editingId === product.id ? (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleUpdate(product.id)}
                                disabled={updateStock.isPending}
                                className="rounded-full bg-brand-600 p-2 text-white shadow-lg transition hover:bg-brand-700 disabled:opacity-50"
                              >
                                <Save size={16} />
                              </button>
                              <button 
                                onClick={() => setEditingId(null)}
                                className="rounded-full bg-ink-200 p-2 text-ink-700 shadow-lg transition hover:bg-ink-300"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(product.id);
                                setEditValue(product.stock);
                              }}
                              className="btn-secondary rounded-full px-4 py-1.5 text-xs font-semibold"
                            >
                              Edit Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card-shell rounded-[34px] bg-amber-50/50">
            <div className="mb-4 flex items-center gap-2 text-amber-700">
              <AlertTriangle size={20} />
              <h3 className="font-semibold">Low Stock Alerts</h3>
            </div>
            <p className="mb-4 text-sm text-amber-800/80">Threshold currently set to <span className="font-bold">{threshold}</span> units.</p>
            
            <div className="space-y-3">
              {lowStock.data?.map(product => (
                <div key={product.id} className="flex items-center justify-between rounded-2xl bg-white/80 p-3 shadow-soft">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{product.name}</p>
                    <p className="text-xs text-red-500 font-bold">{product.stock} left</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingId(product.id);
                      setEditValue(product.stock);
                    }}
                    className="p-2 text-brand-600 transition hover:bg-brand-50 rounded-full"
                  >
                    <Package size={16} />
                  </button>
                </div>
              ))}
              {lowStock.data?.length === 0 && (
                <div className="rounded-2xl bg-white/40 border border-dashed border-amber-200 p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-2 text-amber-400" size={32} />
                  <p className="text-sm text-amber-700">No low stock items!</p>
                </div>
              )}
            </div>
          </div>

          <div className="card-shell rounded-[34px]">
            <h3 className="mb-2 font-semibold text-ink-900">Settings</h3>
            <label className="text-xs font-medium text-ink-500 uppercase tracking-wider">Alert Threshold</label>
            <div className="mt-2 flex items-center gap-3">
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={threshold} 
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="font-bold text-brand-600 w-8">{threshold}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
