import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import {
  cancelRequest,
  createOrder,
  getAllOrders,
  getOrderById,
  getOrderStats,
  getUserOrders,
  updateOrderStatus,
  approveCancel,
  rejectCancel,
} from '../controllers/orders.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/admin/list', requireAdmin, asyncHandler(getAllOrders));
router.get('/admin/stats', requireAdmin, asyncHandler(getOrderStats));
router.patch('/:id/status', requireAdmin, asyncHandler(updateOrderStatus));
router.post('/:id/approve-cancel', requireAdmin, asyncHandler(approveCancel));
router.post('/:id/reject-cancel', requireAdmin, asyncHandler(rejectCancel));

router.post('/', asyncHandler(createOrder));
router.get('/', asyncHandler(getUserOrders));
router.get('/:id', asyncHandler(getOrderById));
router.post('/:id/cancel-request', asyncHandler(cancelRequest));

export default router;
