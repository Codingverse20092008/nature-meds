import type { NextFunction, Request, Response } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { getDatabase } from '../config/database.js';
import { cartItems, carts, categories, products } from '../db/schema.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { BadRequestError, HttpError, NotFoundError } from '../middleware/error.middleware.js';

function requireUser(req: Request): NonNullable<AuthRequest['user']> {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new HttpError(401, 'Authentication required');
  }

  return authReq.user;
}

async function ensureCart(userId: number) {
  const db = getDatabase();
  const existing = await db
    .select()
    .from(carts)
    .where(and(eq(carts.userId, userId), eq(carts.isActive, true)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(carts)
    .values({
      userId,
      isActive: true,
      sessionId: null,
      expiresAt: null,
    })
    .returning();

  return created;
}

async function buildCartResponse(userId: number) {
  const db = getDatabase();
  const cart = await ensureCart(userId);

  const items = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      productId: products.id,
      productName: products.name,
      slug: products.slug,
      price: products.price,
      stock: products.stock,
      imageUrl: products.imageUrl,
      requiresPrescription: products.requiresPrescription,
      category: categories.name,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(cartItems.cartId, cart.id));

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    id: cart.id,
    items: items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.productId,
        name: item.productName,
        slug: item.slug,
        price: item.price,
        stock: item.stock,
        imageUrl: item.imageUrl,
        requiresPrescription: item.requiresPrescription,
        category: item.category,
      },
      lineTotal: Number((item.price * item.quantity).toFixed(2)),
    })),
    subtotal: Number(subtotal.toFixed(2)),
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

async function upsertCartLine(userId: number, productId: number, quantity: number) {
  const db = getDatabase();
  const cart = await ensureCart(userId);

  const [product] = await db
    .select({
      id: products.id,
      stock: products.stock,
      isActive: products.isActive,
      name: products.name,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product || !product.isActive) {
    throw new NotFoundError('Product is not available');
  }

  if (quantity <= 0) {
    throw new BadRequestError('Quantity must be greater than zero');
  }

  if (quantity > product.stock) {
    throw new BadRequestError(`Only ${product.stock} units available for ${product.name}`);
  }

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)))
    .limit(1);

  if (existing) {
    await db
      .update(cartItems)
      .set({
        quantity,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id,
      productId,
      quantity,
    });
  }

  await db
    .update(carts)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(carts.id, cart.id));
}

export async function getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const cart = await buildCartResponse(user.id);
    res.json({ success: true, data: cart });
  } catch (error) {
    console.error('[CartController] getCart error:', error);
    next(error);
  }
}

export async function addToCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const { productId, quantity = 1 } = req.body as Record<string, unknown>;

    const numericProductId = Number(productId);
    const numericQuantity = Number(quantity);
    if (!Number.isFinite(numericProductId)) {
      throw new BadRequestError('Valid productId is required');
    }

    await upsertCartLine(user.id, numericProductId, numericQuantity);
    const cart = await buildCartResponse(user.id);
    res.status(201).json({ success: true, message: 'Item added to cart', data: cart });
  } catch (error) {
    console.error('[CartController] addToCart error:', error);
    next(error);
  }
}

export async function updateCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const productId = Number(req.params.productId);
    const quantity = Number((req.body as Record<string, unknown>).quantity);

    if (!Number.isFinite(productId)) {
      throw new BadRequestError('Valid productId is required');
    }

    if (quantity <= 0) {
      await removeCartItemByProduct(user.id, productId);
    } else {
      await upsertCartLine(user.id, productId, quantity);
    }

    const cart = await buildCartResponse(user.id);
    res.json({ success: true, message: 'Cart updated', data: cart });
  } catch (error) {
    console.error('[CartController] updateCartItem error:', error);
    next(error);
  }
}

async function removeCartItemByProduct(userId: number, productId: number) {
  const db = getDatabase();
  const cart = await ensureCart(userId);
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)));
}

export async function removeCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const productId = Number(req.params.productId);

    if (!Number.isFinite(productId)) {
      throw new BadRequestError('Valid productId is required');
    }

    await removeCartItemByProduct(user.id, productId);
    const cart = await buildCartResponse(user.id);
    res.json({ success: true, message: 'Item removed from cart', data: cart });
  } catch (error) {
    console.error('[CartController] removeCartItem error:', error);
    next(error);
  }
}

export async function syncCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const items = ((req.body as Record<string, unknown>).items ?? []) as Array<{ productId: number; quantity: number }>;

    if (!Array.isArray(items)) {
      throw new BadRequestError('items must be an array');
    }

    const validItems = items
      .map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      }))
      .filter((item) => Number.isFinite(item.productId) && Number.isFinite(item.quantity) && item.quantity > 0);

    const uniqueByProduct = new Map<number, number>();
    validItems.forEach((item) => {
      uniqueByProduct.set(item.productId, item.quantity);
    });

    const db = getDatabase();
    const productIds = [...uniqueByProduct.keys()];
    if (productIds.length > 0) {
      const existingProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(inArray(products.id, productIds));

      const allowed = new Set(existingProducts.map((product) => product.id));
      for (const [productId, quantity] of uniqueByProduct.entries()) {
        if (allowed.has(productId)) {
          await upsertCartLine(user.id, productId, quantity);
        }
      }
    }

    const cart = await buildCartResponse(user.id);
    res.json({ success: true, message: 'Cart synchronized', data: cart });
  } catch (error) {
    console.error('[CartController] syncCart error:', error);
    next(error);
  }
}
