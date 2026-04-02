import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  getAllUsers,
  changePassword,
  deleteUser,
  verifyEmail,
  resendVerificationEmail,
  updateLanguage,
} from '../controllers/user.controller.js';

const router = Router();

// Public routes
router.post('/register', asyncHandler(registerUser));
router.post('/login', asyncHandler(loginUser));
router.post('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-verification', asyncHandler(resendVerificationEmail));

// Protected routes
router.get(
  '/me',
  authenticate,
  asyncHandler(getProfile)
);

router.put(
  '/me',
  authenticate,
  asyncHandler(updateProfile)
);

router.patch(
  '/me/language',
  authenticate,
  asyncHandler(updateLanguage)
);

router.post(
  '/me/change-password',
  authenticate,
  asyncHandler(changePassword)
);

router.post(
  '/me/resend-verification',
  authenticate,
  asyncHandler(resendVerificationEmail)
);

// Admin routes
router.get(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(getAllUsers)
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(deleteUser)
);

export default router;
