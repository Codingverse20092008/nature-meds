import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { chatWithAssistant } from '../controllers/ai.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user ? `user:${authReq.user.id}` : `guest:${ipKeyGenerator(req.ip ?? 'unknown')}`;
  },
  message: {
    success: false,
    message: 'Too many AI chat requests. Please slow down and try again shortly.',
  },
});

router.post('/chat', optionalAuth, aiLimiter, asyncHandler(chatWithAssistant));

export default router;
