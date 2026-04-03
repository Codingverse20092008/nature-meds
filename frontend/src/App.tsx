import { lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthUser } from './lib/queries';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((module) => ({ default: module.ProductsPage })));
const ProductDetailsPage = lazy(() =>
  import('./pages/ProductDetailsPage').then((module) => ({ default: module.ProductDetailsPage }))
);
const CartPage = lazy(() => import('./pages/CartPage').then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const OrderDetailsPage = lazy(() =>
  import('./pages/OrderDetailsPage').then((module) => ({ default: module.OrderDetailsPage }))
);
const OrderSuccessPage = lazy(() =>
  import('./pages/OrderSuccessPage').then((module) => ({ default: module.OrderSuccessPage }))
);
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const AdminStockPage = lazy(() => import('./pages/AdminStockPage').then((module) => ({ default: module.AdminStockPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((module) => ({ default: module.ContactPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then((module) => ({ default: module.PrivacyPolicyPage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage })));

export default function App() {
  const location = useLocation();
  useAuthUser();

  return (
    <ErrorBoundary>
      <AppLayout>
        <AnimatePresence mode="wait">
          <Suspense fallback={<div className="section-shell"><div className="card-shell rounded-[30px] px-8 py-20 text-center text-ink-500">Loading page...</div></div>}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:productId" element={<ProductDetailsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:orderId"
                element={
                  <ProtectedRoute>
                    <OrderDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/order-success"
                element={
                  <ProtectedRoute>
                    <OrderSuccessPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="admin">
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/inventory"
                element={
                  <ProtectedRoute role="admin">
                    <AdminStockPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </AppLayout>
    </ErrorBoundary>
  );
}
