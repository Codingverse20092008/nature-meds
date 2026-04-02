import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { and, eq, like, or, sql } from 'drizzle-orm';
import { getDatabase } from '../config/database.js';
import { emailVerificationTokens, users, type NewUser } from '../db/schema.js';
import { HttpError, BadRequestError, NotFoundError } from '../middleware/error.middleware.js';
import { generateToken, type AuthRequest } from '../middleware/auth.middleware.js';
import { isEmailServiceConfigured, sendVerificationEmail } from '../services/email.service.js';
import { hashPassword, verifyPasswordCompat } from '../utils/security.js';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

async function issueVerificationToken(userId: number) {
  const db = getDatabase();
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
  await db.insert(emailVerificationTokens).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Register a new user
 */
export async function registerUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const { email, password, firstName, lastName, phone, alternatePhone, address } = req.body as Record<string, unknown>;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw new BadRequestError('Email, password, first name, and last name are required');
    }

    // Check if user already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, asString(email).toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      throw new HttpError(409, 'User with this email already exists');
    }

    const normalizedPassword = asString(password);
    if (normalizedPassword.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    const passwordHash = hashPassword(normalizedPassword);

    // Create user
    const newUser: NewUser = {
      email: asString(email).toLowerCase(),
      passwordHash,
      firstName: asString(firstName),
      lastName: asString(lastName),
      phone: asString(phone) || null,
      alternatePhone: asString(alternatePhone) || null,
      role: 'customer',
      address: asString(address) || null,
      city: null,
      state: null,
      zipCode: null,
      country: 'India',
      isVerified: false,
      isActive: true,
    };

    const result = await db.insert(users).values(newUser).returning();
    const createdUser = result[0];
    const verificationToken = await issueVerificationToken(createdUser.id);

    await sendVerificationEmail({
      email: createdUser.email,
      firstName: createdUser.firstName,
      token: verificationToken,
    });

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = createdUser;

    const token = generateToken({
      id: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    });

    res.status(201).json({
      success: true,
      message: isEmailServiceConfigured()
        ? 'User registered successfully. Verification email sent.'
        : 'User registered successfully. Configure SMTP to send verification emails.',
      data: {
        user: userWithoutPassword,
        token,
        verificationEmailSent: isEmailServiceConfigured(),
      },
    });
  } catch (error) {
    console.error('[UserController] registerUser error:', error);
    next(error);
  }
}

/**
 * Login user
 */
export async function loginUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const { email, password } = req.body as Record<string, unknown>;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, asString(email).toLowerCase()))
      .limit(1);

    if (user.length === 0) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const dbUser = user[0];

    if (!verifyPasswordCompat(asString(password), dbUser.passwordHash)) {
      throw new HttpError(401, 'Invalid email or password');
    }

    if (!dbUser.isActive) {
      throw new HttpError(403, 'Account is deactivated');
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, dbUser.id));

    const token = generateToken({
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    });

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = dbUser;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error('[UserController] loginUser error:', error);
    next(error);
  }
}

/**
 * Get current user profile
 */
export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      throw new HttpError(401, 'Not authenticated');
    }

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        alternatePhone: users.alternatePhone,
        role: users.role,
        address: users.address,
        city: users.city,
        state: users.state,
        zipCode: users.zipCode,
        language: users.language,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, authReq.user.id))
      .limit(1);

    if (user.length === 0) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: user[0],
    });
  } catch (error) {
    console.error('[UserController] getProfile error:', error);
    next(error);
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      throw new HttpError(401, 'Not authenticated');
    }

    const { firstName, lastName, phone, alternatePhone, address, city, state, zipCode, language } = req.body as Record<string, unknown>;

    const updateData: Record<string, any> = {};
    if (firstName !== undefined) updateData.firstName = asString(firstName);
    if (lastName !== undefined) updateData.lastName = asString(lastName);
    if (phone !== undefined) updateData.phone = asString(phone) || null;
    if (alternatePhone !== undefined) updateData.alternatePhone = asString(alternatePhone) || null;
    if (address !== undefined) updateData.address = asString(address) || null;
    if (city !== undefined) updateData.city = asString(city) || null;
    if (state !== undefined) updateData.state = asString(state) || null;
    if (zipCode !== undefined) updateData.zipCode = asString(zipCode) || null;
    if (language !== undefined) updateData.language = asString(language) || 'en';
    updateData.country = 'India';

    const result = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, authReq.user.id))
      .returning();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result[0],
    });
  } catch (error) {
    console.error('[UserController] updateProfile error:', error);
    next(error);
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const page = Math.max(1, Number.parseInt(asString(req.query.page, '1'), 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(asString(req.query.limit, '20'), 10)));
    const role = asString(req.query.role);
    const search = asString(req.query.search);
    const offset = (page - 1) * limit;

    const conditions = [eq(users.isActive, true)];

    if (role) {
      conditions.push(eq(users.role, role as 'customer' | 'admin' | 'pharmacist'));
    }

    if (search) {
      const searchCondition = or(
        like(users.email, `%${search}%`),
        like(users.firstName, `%${search}%`),
        like(users.lastName, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        alternatePhone: users.alternatePhone,
        role: users.role,
        city: users.city,
        language: users.language,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    res.json({
      success: true,
      data: userList,
      pagination: {
        page,
        limit,
        total: countResult[0]?.count || 0,
        totalPages: Math.ceil((countResult[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[UserController] getAllUsers error:', error);
    next(error);
  }
}

/**
 * Change password
 */
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      throw new HttpError(401, 'Not authenticated');
    }

    const { currentPassword, newPassword } = req.body as Record<string, unknown>;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current password and new password are required');
    }

    const user = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, authReq.user.id))
      .limit(1);

    if (user.length === 0 || !verifyPasswordCompat(asString(currentPassword), user[0].passwordHash)) {
      throw new HttpError(401, 'Current password is incorrect');
    }

    const normalizedNewPassword = asString(newPassword);
    if (normalizedNewPassword.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters long');
    }

    const newPasswordHash = hashPassword(normalizedNewPassword);

    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, authReq.user.id));

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('[UserController] changePassword error:', error);
    next(error);
  }
}

/**
 * Delete user (admin or self)
 */
export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const authReq = req as AuthRequest;
    const { id } = req.params;

    if (!authReq.user) {
      throw new HttpError(401, 'Not authenticated');
    }

    const userId = Number.parseInt(asString(id), 10);

    // Check if user exists
    const user = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new NotFoundError('User not found');
    }

    // Admins can delete any user, users can only delete themselves
    if (authReq.user.role !== 'admin' && authReq.user.id !== userId) {
      throw new HttpError(403, 'Not authorized to delete this user');
    }

    // Soft delete by setting isActive to false
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('[UserController] deleteUser error:', error);
    next(error);
  }
}

/**
 * Verify email address
 */
export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const { token } = req.body as Record<string, unknown>;
    const normalizedToken = asString(token).trim();

    if (!normalizedToken) {
      throw new BadRequestError('Verification token is required');
    }

    const existing = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, normalizedToken))
      .limit(1);

    if (existing.length === 0) {
      throw new BadRequestError('Invalid verification token');
    }

    if (new Date(existing[0].expiresAt).getTime() < Date.now()) {
      await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, existing[0].id));
      throw new BadRequestError('Verification token has expired');
    }

    await db
      .update(users)
      .set({
        isVerified: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, existing[0].userId));

    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, existing[0].id));

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('[UserController] verifyEmail error:', error);
    next(error);
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const authReq = req as AuthRequest;
    const email = asString((req.body as Record<string, unknown>).email).toLowerCase();

    let userRecord;

    if (authReq.user) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, authReq.user.id))
        .limit(1);
      userRecord = user;
    } else if (email) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      userRecord = user;
    } else {
      throw new BadRequestError('Email is required');
    }

    if (!userRecord) {
      throw new NotFoundError('User not found');
    }

    if (userRecord.isVerified) {
      res.json({
        success: true,
        message: 'Email is already verified',
      });
      return;
    }

    const token = await issueVerificationToken(userRecord.id);

    await sendVerificationEmail({
      email: userRecord.email,
      firstName: userRecord.firstName,
      token,
    });

    res.json({
      success: true,
      message: isEmailServiceConfigured()
        ? 'Verification email sent'
        : 'SMTP is not configured. Verification email could not be sent.',
    });
  } catch (error) {
    console.error('[UserController] resendVerificationEmail error:', error);
    next(error);
  }
}

/**
 * Update user language preference
 */
export async function updateLanguage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      throw new HttpError(401, 'Not authenticated');
    }

    const { language } = req.body as Record<string, unknown>;
    const validLanguages = ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or'];

    if (!language || !validLanguages.includes(asString(language))) {
      throw new BadRequestError('Invalid language code');
    }

    await db
      .update(users)
      .set({
        language: asString(language),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, authReq.user.id));

    res.json({
      success: true,
      message: 'Language updated successfully',
    });
  } catch (error) {
    console.error('[UserController] updateLanguage error:', error);
    next(error);
  }
}
