import { motion } from 'framer-motion';
import { FileUp, RefreshCcw, Search, UploadCloud } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { TableSkeleton } from '../components/Skeletons';
import { formatCurrencyINR } from '../lib/catalog';
import { useAdminOrders, useImportLogDetails, useImportLogs, useImportStats, useRetryImport, useUpdateOrderStatus, useUploadCsv, useApproveCancel, useRejectCancel } from '../lib/queries';
import { useDocumentMeta } from '../lib/meta';
import { useAuthStore } from '../store/authStore';

export function AdminPage() {
  const [progress, setProgress] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<number | undefined>(undefined);
  const { user, token } = useAuthStore();
  const upload = useUploadCsv();
  const retryImport = useRetryImport();
  const orders = useAdminOrders();
  const updateOrderStatus = useUpdateOrderStatus();
  const approveCancel = useApproveCancel();
  const rejectCancel = useRejectCancel();
  const logs = useImportLogs({ status: statusFilter || undefined });
  const stats = useImportStats();
  const logDetails = useImportLogDetails(selectedLogId);
  useDocumentMeta('Admin CSV imports', 'Upload medicine CSV files, inspect import logs, and retry failed imports.');

  // Redirect if not authenticated or not admin
  if (!token || !user) {
    return <Navigate to="/auth" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Handle query errors
  if (orders.isError) {
    return (
      <div className="section-shell">
        <div className="card-shell rounded-[34px] p-8 text-center">
          <p className="text-lg font-semibold text-ink-900">Failed to load admin data</p>
          <p className="mt-2 text-sm text-ink-500">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (!file) {
        return;
      }

      setProgress(0);
      try {
        await upload.mutateAsync({
          file,
          onUploadProgress: setProgress,
        });
        toast.success(`Uploaded ${file.name} successfully`);
      } catch {
        toast.error('Upload failed. Please review your CSV and try again.');
      }
    },
    [upload]
  );

  const dropzone = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Admin control"
        title="CSV inventory import with logs, retry, and live upload progress."
        description="Built for pharmacy administrators to upload medicine CSV files, inspect failures, and re-run imports using the backend import log endpoints."
      />

      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-6">
          <motion.div whileHover={{ scale: 1.01 }} className="card-shell rounded-[34px] border-dashed p-8 text-center">
            <div {...dropzone.getRootProps()} className="cursor-pointer">
              <input {...dropzone.getInputProps()} />
            <div className="mx-auto mb-4 flex size-18 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(25,125,255,0.15),rgba(22,166,121,0.15))] text-brand-600">
              <UploadCloud size={32} />
            </div>
            <h3 className="text-2xl font-semibold text-ink-900">Drop a medicine CSV here</h3>
            <p className="mt-3 text-sm leading-6 text-ink-500">Drag and drop your product CSV or click to select a file for the secured `/api/v1/csv/upload` endpoint.</p>
            <button type="button" className="btn-primary mt-6">
              <FileUp size={16} />
              Select CSV
            </button>
            <div className="mt-6 overflow-hidden rounded-full bg-surface-100">
              <div className="h-3 rounded-full bg-[linear-gradient(90deg,#197dff,#16a679)] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm font-medium text-ink-600">{upload.isPending ? `Uploading... ${progress}%` : 'Awaiting upload'}</p>
            </div>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Imports" value={String(stats.data?.data?.aggregated?.totalImports ?? 0)} />
            <StatCard label="Rows processed" value={String(stats.data?.data?.aggregated?.totalRows ?? 0)} />
            <StatCard label="Failed rows" value={String(stats.data?.data?.aggregated?.failureCount ?? 0)} />
          </div>
        </section>

        <section className="card-shell rounded-[34px]">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h3 className="text-xl font-semibold text-ink-900">Import logs</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3 py-2 text-sm text-ink-500">
                <Search size={14} />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="bg-transparent outline-none">
                  <option value="">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                </select>
              </div>
            </div>
          </div>

          {logs.isLoading ? (
            <TableSkeleton />
          ) : logs.data && logs.data.length > 0 ? (
            <div className="space-y-4">
              {logs.data.map((log) => (
                <motion.div key={log.id} layout className="rounded-[26px] border border-surface-100 bg-surface-50 px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-900">{log.fileName}</span>
                        <StatusBadge status={log.status} />
                      </div>
                      <p className="text-sm text-ink-500">{log.recordType} · {new Date(log.createdAt).toLocaleString()}</p>
                      <p className="mt-2 text-sm text-ink-600">
                        Success: {log.successCount} · Failed: {log.failureCount} · Total rows: {log.totalRows}
                      </p>
                      <button type="button" onClick={() => setSelectedLogId(log.id)} className="mt-3 text-sm font-semibold text-brand-600">
                        View detailed errors
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await retryImport.mutateAsync(log.id);
                          toast.success(`Retry triggered for ${log.fileName}`);
                        } catch {
                          toast.error('Retry failed for this import');
                        }
                      }}
                      className="btn-secondary"
                    >
                      <RefreshCcw size={16} />
                      Retry import
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] bg-surface-50 px-6 py-12 text-center text-ink-500">No import logs yet. Upload your first medicine CSV to begin.</div>
          )}
        </section>
      </div>

      <section className="card-shell mt-8 rounded-[34px]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-ink-900">Order management</h3>
            <p className="mt-2 text-sm text-ink-500">Confirm, ship, and deliver COD orders from one place.</p>
          </div>
        </div>

        {orders.isLoading ? (
          <TableSkeleton />
        ) : orders.data && orders.data.length > 0 ? (
          <div className="space-y-4">
            {orders.data.slice(0, 12).map((order) => (
              <div key={order.id} className="rounded-[26px] border border-surface-100 bg-surface-50 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-ink-900">{order.orderNumber}</p>
                    <p className="mt-1 text-sm text-ink-500">
                      {new Date(order.createdAt).toLocaleString()} · {order.status}
                    </p>
                    <p className="mt-2 text-sm text-ink-700">
                      {order.items?.length ?? 0} items · {formatCurrencyINR(order.total)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.status === 'cancel_requested' ? (
                      <>
                        <button
                          type="button"
                          className="btn-secondary border-green-200 text-green-600 hover:bg-green-50"
                          disabled={approveCancel.isPending}
                          onClick={async () => {
                            try {
                              await approveCancel.mutateAsync(order.id);
                              toast.success('Cancellation approved');
                            } catch {
                              toast.error('Failed to approve cancellation');
                            }
                          }}
                        >
                          Approve Cancel ✓
                        </button>
                        <button
                          type="button"
                          className="btn-secondary border-red-200 text-red-600 hover:bg-red-50"
                          disabled={rejectCancel.isPending}
                          onClick={async () => {
                            try {
                              await rejectCancel.mutateAsync(order.id);
                              toast.success('Cancellation rejected');
                            } catch {
                              toast.error('Failed to reject cancellation');
                            }
                          }}
                        >
                          Reject ✕
                        </button>
                      </>
                    ) : (
                      <>
                        {(['confirmed', 'shipped', 'delivered'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            className="btn-secondary"
                            disabled={updateOrderStatus.isPending || order.status === status}
                            onClick={async () => {
                              try {
                                await updateOrderStatus.mutateAsync({ orderId: order.id, status });
                                toast.success(`Order marked as ${status}`);
                              } catch {
                                toast.error('Could not update order status');
                              }
                            }}
                          >
                            Mark {status}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] bg-surface-50 px-6 py-12 text-center text-ink-500">No orders have been placed yet.</div>
        )}
      </section>

      {selectedLogId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/30 px-4">
          <div className="card-shell max-h-[80vh] w-full max-w-3xl overflow-auto rounded-[32px]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-ink-900">Import error details</h3>
              <button type="button" className="btn-secondary px-4 py-2" onClick={() => setSelectedLogId(undefined)}>
                Close
              </button>
            </div>
            {logDetails.isLoading ? (
              <TableSkeleton />
            ) : logDetails.data?.errorReport?.errors?.length ? (
              <div className="space-y-3">
                {logDetails.data.errorReport.errors.slice(0, 25).map((error, index) => (
                  <div key={`${error.row}-${index}`} className="rounded-2xl bg-surface-50 px-4 py-4 text-sm">
                    <p className="font-semibold text-ink-900">Row {error.row} · {error.field}</p>
                    <p className="mt-1 text-ink-600">{error.message}</p>
                    <p className="mt-1 text-xs text-ink-500">Value: {error.value || 'n/a'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-50 px-4 py-8 text-center text-ink-500">No detailed errors were recorded for this import.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-shell rounded-[28px]">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-ink-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: 'processing' | 'completed' | 'failed' }) {
  const classes =
    status === 'completed'
      ? 'bg-mint-50 text-mint-500'
      : status === 'failed'
        ? 'bg-red-50 text-red-600'
        : 'bg-amber-50 text-amber-700';

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${classes}`}>{status}</span>;
}
