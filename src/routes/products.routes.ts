import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import {
  getProducts,
  getProduct,
  searchProducts,
  getCategories,
  getProductsByCategory,
  getFeaturedProducts,
  getLowStockProducts,
  getOutOfStockProducts,
  getExpiringSoonProducts,
} from '../controllers/products.controller.js';

const router = Router();

// Public routes
router.get('/', asyncHandler(getProducts));
router.get('/search', asyncHandler(searchProducts));
router.get('/categories', asyncHandler(getCategories));
router.get('/categories/:slug', asyncHandler(getProductsByCategory));
router.get('/featured', asyncHandler(getFeaturedProducts));

// Admin-only routes
router.get('/admin/low-stock', requireAuth, requireAdmin, asyncHandler(getLowStockProducts));
router.get('/admin/out-of-stock', requireAuth, requireAdmin, asyncHandler(getOutOfStockProducts));
router.get('/admin/expiring-soon', requireAuth, requireAdmin, asyncHandler(getExpiringSoonProducts));

router.get('/:id', asyncHandler(getProduct));

export default router;
