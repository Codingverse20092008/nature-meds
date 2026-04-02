import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  loginUser,
  registerUser,
  resendVerificationEmail,
  verifyEmail,
} from '../controllers/user.controller.js';

const router = Router();

router.post('/register', asyncHandler(registerUser));
router.post('/login', asyncHandler(loginUser));
router.post('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-verification', asyncHandler(resendVerificationEmail));
router.post('/me/resend-verification', authenticate, asyncHandler(resendVerificationEmail));

export default router;
