import type { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '../middleware/error.middleware.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { buildAiSessionKey, chatWithNatureMedCoach } from '../services/ai-coach.service.js';

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export async function chatWithAssistant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const message = asString(req.body?.message).trim();
    const language = asString(req.body?.language, 'en').trim();
    if (!message) {
      throw new BadRequestError('Message is required');
    }

    const authReq = req as AuthRequest;
    const rawSessionSeed = [
      req.ip,
      req.headers['x-forwarded-for'],
      req.headers['user-agent'],
    ]
      .filter(Boolean)
      .join('|');
    const data = await chatWithNatureMedCoach(message, {
      user: authReq.user ?? null,
      sessionKey: buildAiSessionKey(authReq.user ?? null, rawSessionSeed || 'anonymous'),
    }, language);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[AiController] chatWithAssistant error:', error);
    next(error);
  }
}
