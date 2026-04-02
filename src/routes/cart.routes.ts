import { Router } from 'express';
import {
  addToCart,
  getCart,
  removeCartItem,
  syncCart,
  updateCartItem,
} from '../controllers/cart.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(getCart));
router.post('/items', asyncHandler(addToCart));
router.put('/items/:productId', asyncHandler(updateCartItem));
router.delete('/items/:productId', asyncHandler(removeCartItem));
router.post('/sync', asyncHandler(syncCart));

export default router;
