import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BadgePlus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import { getCategoryLabel } from '../lib/catalog';
import { useCategories, useFeaturedProducts } from '../lib/queries';
import { useDocumentMeta } from '../lib/meta';
import { useAuthStore } from '../store/authStore';

const HeroScene = lazy(() => import('../components/HeroScene').then((module) => ({ default: module.HeroScene })));

export function HomePage() {
  const featuredProducts = useFeaturedProducts(4);
  const categories = useCategories();
  const user = useAuthStore((state) => state.user);
  useDocumentMeta('Buy medicines online', 'Search, compare, and order medicines from our verified database with real-time availability.');

  return (
    <div className="space-y-14">
      <section className="section-shell grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="badge-pill mb-5">
            <Sparkles size={14} />
            Verified medicine catalog
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="title-display">
            Buy Medicines Online with Confidence
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-6 max-w-2xl text-lg leading-8 text-ink-600"
          >
            Search, compare, and order medicines from our verified database with real-time availability.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-8 flex flex-wrap gap-3">
            <Link to="/products" className="btn-primary">
              Browse medicines
              <ArrowRight size={16} />
            </Link>
            {user?.role === 'admin' ? (
              <Link to="/admin" className="btn-secondary">
                <BadgePlus size={16} />
                Admin dashboard
              </Link>
            ) : null}
          </motion.div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { title: 'Easy search', text: 'Search medicines by name, brand, or category in seconds.' },
              { title: 'Prescription alerts', text: 'Prescription-required medicines are clearly marked before you add them.' },
              { title: 'Live stock', text: 'Availability updates are shown directly from the pharmacy inventory.' },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + index * 0.08 }}
                className="card-shell"
              >
                <p className="font-semibold text-ink-900">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink-600">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <Suspense fallback={<div className="card-shell h-[380px] rounded-[32px] sm:h-[440px]" />}>
          <HeroScene />
        </Suspense>
      </section>

      <section className="section-shell">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="badge-pill mb-4">Featured medicines</p>
            <h2 className="font-[var(--font-display)] text-3xl font-semibold text-ink-900">Popular products available now</h2>
            <p className="mt-2 text-sm text-ink-500">Selected from currently available medicines in our catalog.</p>
          </div>
          <Link to="/products" className="hidden btn-secondary sm:flex">
            View catalog
          </Link>
        </div>

        {featuredProducts.isLoading ? (
          <ProductGridSkeleton />
        ) : featuredProducts.data && featuredProducts.data.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featuredProducts.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="card-shell text-center text-ink-500">No featured products are currently available.</div>
        )}
      </section>

      <section className="section-shell">
        <div className="mb-6">
          <p className="badge-pill mb-4">Categories</p>
          <h2 className="font-[var(--font-display)] text-3xl font-semibold text-ink-900">Fast access to top treatment groups</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.data?.slice(0, 8).map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="card-shell rounded-[28px]"
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <BadgePlus size={18} />
              </div>
              <h3 className="text-lg font-semibold text-ink-900">{getCategoryLabel(category.name)}</h3>
              <p className="mt-2 text-sm text-ink-500">{category.productCount ?? 0} medicines available</p>
              <Link to={`/products?category=${category.slug}`} className="mt-5 inline-flex text-sm font-semibold text-brand-600">
                Shop category
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
