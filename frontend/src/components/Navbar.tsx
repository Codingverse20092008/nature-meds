import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogOut, Menu, Pill, Search, ShoppingBag, ShieldCheck, UserRound } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { formatCurrencyINR, getCategoryLabel } from '../lib/catalog';
import { useCart, useLogout, useSearchProducts } from '../lib/queries';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { useAuthStore } from '../store/authStore';
import { useGuestCartStore } from '../store/guestCartStore';

export function Navbar() {
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const debounced = useDebouncedValue(search, 250);
  const deferredSearch = useDeferredValue(debounced);
  const { data } = useSearchProducts(deferredSearch, 5);
  const user = useAuthStore((state) => state.user);
  const guestItems = useGuestCartStore((state) => state.items);
  const cartQuery = useCart();
  const logout = useLogout();
  const cartCount = user
    ? (cartQuery.data?.totalItems ?? 0)
    : guestItems.reduce((total, item) => total + item.quantity, 0);

  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/products' },
  ];

  return (
    <header className="sticky top-0 z-30 px-4 py-4 sm:px-6">
      <div className="section-shell">
        <div className="glass-panel flex items-center justify-between gap-4 rounded-[28px] px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#197dff,#16a679)] text-white shadow-[0_12px_30px_rgba(25,125,255,0.25)]">
              <Pill size={20} />
            </div>
            <div>
              <p className="font-[var(--font-display)] text-lg font-semibold">Nature Meds</p>
              <p className="text-xs text-ink-500">Trusted pharmacy care</p>
            </div>
          </Link>

          <div className="relative hidden flex-1 lg:block">
            <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white/80 px-4 py-3 shadow-[0_12px_24px_rgba(17,36,60,0.06)]">
              <Search size={18} className="text-brand-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search medicines, categories, or brands..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-ink-500"
              />
            </div>

            <AnimatePresence>
              {search.trim().length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute left-0 right-0 top-[calc(100%+10px)] rounded-[24px] border border-white/80 bg-white/95 p-3 shadow-[0_20px_50px_rgba(17,36,60,0.12)] backdrop-blur-xl"
                >
                  {data && data.length > 0 ? (
                    <div className="space-y-2">
                      {data.map((product) => (
                        <Link
                          key={product.id}
                          to={`/products/${product.slug}`}
                          className="flex items-center justify-between rounded-2xl px-3 py-3 transition hover:bg-brand-50"
                          onClick={() => setSearch('')}
                        >
                          <div>
                            <p className="font-medium text-ink-900">{product.name}</p>
                            <p className="text-xs text-ink-500">{getCategoryLabel(product.category)}</p>
                          </div>
                          <span className="text-sm font-semibold text-brand-600">{formatCurrencyINR(product.price)}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-surface-50 px-3 py-4 text-sm text-ink-500">
                      No medicines found for that search.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition ${isActive ? 'text-brand-600' : 'text-ink-700 hover:text-brand-600'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-brand-100 bg-white/80 px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-[0_12px_24px_rgba(17,36,60,0.06)]"
                >
                  <span>{user.firstName}</span>
                  <ChevronDown size={16} className={`transition ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {profileOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-[calc(100%+10px)] z-40 min-w-[190px] rounded-[24px] border border-white/80 bg-white/95 p-2 shadow-[0_20px_50px_rgba(17,36,60,0.12)] backdrop-blur-xl"
                    >
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-ink-800 transition hover:bg-brand-50"
                      >
                        <UserRound size={16} />
                        Profile
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-ink-800 transition hover:bg-brand-50"
                      >
                        <ShoppingBag size={16} />
                        Orders
                      </Link>
                      {user.role === 'admin' ? (
                        <Link
                          to="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-ink-800 transition hover:bg-brand-50"
                        >
                          <ShieldCheck size={16} />
                          Admin
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-ink-800 transition hover:bg-brand-50"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/auth" className="btn-secondary px-4 py-2.5">
                <UserRound size={16} />
                Account
              </Link>
            )}
            <Link to="/cart" className="relative btn-primary px-4 py-2.5">
              <ShoppingBag size={16} />
              Cart
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-600">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex size-11 items-center justify-center rounded-2xl border border-brand-100 bg-white/80 text-ink-900 lg:hidden"
          >
            <Menu size={20} />
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass-panel mt-3 rounded-[26px] p-4 lg:hidden"
            >
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand-100 bg-white/80 px-4 py-3">
                <Search size={18} className="text-brand-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search medicines..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="space-y-3">
                {navItems.map((item) => (
                  <Link key={item.to} to={item.to} className="block rounded-2xl px-3 py-2 text-sm font-medium text-ink-800">
                    {item.label}
                  </Link>
                ))}
                {user ? (
                  <>
                    <Link to="/profile" className="block rounded-2xl px-3 py-2 text-sm font-medium text-ink-800">
                      Profile
                    </Link>
                    <Link to="/orders" className="block rounded-2xl px-3 py-2 text-sm font-medium text-ink-800">
                      Orders
                    </Link>
                    {user.role === 'admin' ? (
                      <Link to="/admin" className="block rounded-2xl px-3 py-2 text-sm font-medium text-ink-800">
                        Admin
                      </Link>
                    ) : null}
                  </>
                ) : null}
                <Link to="/cart" className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
                  <ShoppingBag size={16} />
                  Cart ({cartCount})
                </Link>
                {user ? (
                  <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-2xl bg-surface-50 px-3 py-2 text-sm font-medium text-ink-800">
                    <LogOut size={16} />
                    Logout
                  </button>
                ) : (
                  <Link to="/auth" className="flex items-center gap-2 rounded-2xl bg-surface-50 px-3 py-2 text-sm font-medium text-ink-800">
                    <ShieldCheck size={16} />
                    Login / Signup
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
