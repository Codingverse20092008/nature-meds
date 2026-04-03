import { motion } from 'framer-motion';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Funnel, Search, SlidersHorizontal } from 'lucide-react';
import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ProductCard } from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import { formatCurrencyINR, getCategoryLabel } from '../lib/catalog';
import { useCategories, useProducts, useSearchProducts } from '../lib/queries';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { useDocumentMeta } from '../lib/meta';

export function ProductsPage() {
  const [category, setCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [maxPrice, setMaxPrice] = useState(5000);
  const [page, setPage] = useState(1);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const categories = useCategories();
  const products = useProducts({
    page,
    category: category || undefined,
    maxPrice,
    limit: 24,
  });

  const debounced = useDebouncedValue(searchInput, 300);
  const deferredSearch = useDeferredValue(debounced);
  const searchedProducts = useSearchProducts(deferredSearch, 24);
  const data = deferredSearch.trim().length > 1 ? searchedProducts.data : products.data?.data;
  const isLoading = deferredSearch.trim().length > 1 ? searchedProducts.isLoading : products.isLoading;
  const pagination = products.data?.pagination;
  useDocumentMeta('Shop medicines', 'Search and filter pharmacy products from your live backend inventory.');

  useEffect(() => {
    setPage(1);
  }, [category, maxPrice]);

  useEffect(() => {
    if (deferredSearch.trim().length > 1) {
      setPage(1);
    }
  }, [deferredSearch]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!categoryMenuRef.current?.contains(event.target as Node)) {
        setCategoryMenuOpen(false);
      }
    }

    if (categoryMenuOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }

    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [categoryMenuOpen]);

  const selectedCategoryLabel = category
    ? getCategoryLabel(categories.data?.find((item) => item.slug === category)?.name ?? category)
    : 'All categories';

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Pharmacy catalog"
        title="Browse Medicines"
        description="Find medicines by name, category, or brand."
      />

      <div className="grid gap-8 xl:grid-cols-[280px_1fr]">
        <aside className="card-shell h-fit space-y-6 rounded-[30px]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Funnel size={16} className="text-brand-500" />
              <p className="font-semibold text-ink-900">Filter inventory</p>
            </div>
            <p className="text-sm leading-6 text-ink-500">Choose a category and price range to narrow the catalog.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Category</label>
            <div ref={categoryMenuRef} className="relative">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-[22px] border border-brand-100 bg-white px-4 py-3 text-left text-sm font-medium text-ink-800 shadow-[0_12px_24px_rgba(17,36,60,0.05)] transition hover:border-brand-200"
                onClick={() => setCategoryMenuOpen((current) => !current)}
              >
                <span>{selectedCategoryLabel}</span>
                <ChevronDown size={16} className={`text-brand-600 transition ${categoryMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {categoryMenuOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 max-h-72 overflow-y-auto rounded-[24px] border border-brand-100 bg-white p-2 shadow-[0_24px_50px_rgba(17,36,60,0.14)]">
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('');
                      setCategoryMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-[18px] px-3 py-3 text-left text-sm font-medium text-ink-800 transition hover:bg-brand-50"
                  >
                    <span>All categories</span>
                    {!category ? <Check size={15} className="text-brand-600" /> : null}
                  </button>
                  {categories.data?.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCategory(item.slug);
                        setCategoryMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-[18px] px-3 py-3 text-left text-sm font-medium text-ink-800 transition hover:bg-brand-50"
                    >
                      <span>{getCategoryLabel(item.name)}</span>
                      {category === item.slug ? <Check size={15} className="text-brand-600" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-ink-700">Max price</label>
              <span className="text-sm font-semibold text-brand-600">{formatCurrencyINR(maxPrice)}</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="50"
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() =>
              startTransition(() => {
                setCategory('');
                setMaxPrice(5000);
                setSearchInput('');
              })
            }
          >
            <SlidersHorizontal size={16} />
            Reset filters
          </button>
        </aside>

        <section>
          <div className="card-shell mb-6 flex items-center gap-3 rounded-[30px] px-5 py-4">
            <Search size={18} className="text-brand-500" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search medicines, brands, or generic names"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          {deferredSearch.trim().length <= 1 && pagination ? (
            <div className="mb-5 flex flex-col gap-3 rounded-[24px] border border-brand-100 bg-white/80 px-5 py-4 text-sm text-ink-600 shadow-[0_12px_24px_rgba(17,36,60,0.05)] sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing page <span className="font-semibold text-ink-900">{pagination.page}</span> of{' '}
                <span className="font-semibold text-ink-900">{pagination.totalPages}</span> from{' '}
                <span className="font-semibold text-brand-700">{pagination.total.toLocaleString()}</span> medicines.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={pagination.page <= 1 || isLoading}
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>
                <button
                  type="button"
                  className="btn-secondary px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <ProductGridSkeleton />
          ) : data && data.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {data.map((product, index) => (
                  <motion.div key={product.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>

              {deferredSearch.trim().length > 1 ? (
                <div className="mt-6 rounded-[24px] border border-brand-100 bg-white/80 px-5 py-4 text-sm text-ink-600 shadow-[0_12px_24px_rgba(17,36,60,0.05)]">
                  Search mode shows the top 24 matches quickly. Clear the search to continue browsing all {pagination?.total.toLocaleString() ?? 'available'} medicines page by page.
                </div>
              ) : pagination && pagination.totalPages > 1 ? (
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <button
                    type="button"
                    className="btn-secondary px-5 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={pagination.page <= 1 || isLoading}
                  >
                    <ChevronLeft size={16} />
                    Previous page
                  </button>
                  <div className="text-sm text-ink-600">
                    Page <span className="font-semibold text-ink-900">{pagination.page}</span> /{' '}
                    <span className="font-semibold text-ink-900">{pagination.totalPages}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-primary px-5 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                    disabled={pagination.page >= pagination.totalPages || isLoading}
                  >
                    Next page
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="card-shell rounded-[30px] px-8 py-16 text-center">
              <h3 className="text-xl font-semibold text-ink-900">No products match these filters.</h3>
              <p className="mt-3 text-sm text-ink-500">Try a broader search or reset filters to browse more medicines.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
