import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ShieldAlert, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { MouseEvent } from 'react';
import { MedicineImage } from './MedicineImage';
import { formatCurrencyINR, getCategoryLabel } from '../lib/catalog';
import { useAddToCart } from '../lib/queries';
import type { Product } from '../lib/types';

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 180, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 180, damping: 20 });
  const glare = useTransform([springX, springY], (values) => {
    const [x, y] = values as [number, number];
    return `radial-gradient(circle at ${50 + y * 2}% ${50 - x * 2}%, rgba(255,255,255,0.9), transparent 45%)`;
  });

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    rotateX.set(((y / bounds.height) - 0.5) * -10);
    rotateY.set(((x / bounds.width) - 0.5) * 10);
  };

  return (
    <motion.div
      style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMove}
      onMouseLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
      whileHover={{ y: -6 }}
      className="group relative"
    >
      <div className="card-shell relative h-full overflow-hidden">
        <motion.div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: glare }} />
        <div className="relative flex h-full flex-col" style={{ transform: 'translateZ(24px)' }}>
          <div className="mb-5 flex items-start justify-between">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {getCategoryLabel(product.category)}
            </span>
            {product.requiresPrescription && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <ShieldAlert size={12} />
                Rx
              </span>
            )}
          </div>

          <MedicineImage
            src={product.imageUrl}
            alt={product.name}
            className="mb-5 flex h-64 w-full items-center justify-center rounded-3xl sm:h-72 lg:h-80"
          />

          <div className="space-y-3">
            <Link to={`/products/${product.slug}`} className="block text-xl font-semibold text-ink-900 transition group-hover:text-brand-600">
              {product.name}
            </Link>
            <p className="line-clamp-2 text-sm leading-6 text-ink-600">
              {product.description ?? 'Trusted healthcare essentials sourced from your live pharmacy inventory.'}
            </p>
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-500">Manufacturer: {product.manufacturer ?? 'Verified supplier'}</span>
              {product.stock <= 0 ? (
                <span className="font-bold text-red-500">Out of Stock</span>
              ) : product.stock < 10 ? (
                <span className="font-bold text-amber-500">Only {product.stock} left</span>
              ) : (
                <span className="text-ink-500">{product.stock} in stock</span>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-ink-500">Price</p>
              <p className="text-2xl font-bold text-ink-900">{formatCurrencyINR(product.price)}</p>
            </div>
            <button
              type="button"
              className={`btn-primary px-4 py-2.5 ${product.stock <= 0 ? 'cursor-not-allowed opacity-50 grayscale' : ''}`}
              disabled={product.stock <= 0 || addToCart.isPending}
              onClick={async (event) => {
                event.preventDefault();
                if (product.stock <= 0) return;
                await addToCart.mutateAsync({ product, quantity: 1 });
                toast.success(`${product.name} added to cart`);
              }}
            >
              {product.stock <= 0 ? (
                'Empty'
              ) : (
                <>
                  <ShoppingCart size={16} />
                  Add
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
