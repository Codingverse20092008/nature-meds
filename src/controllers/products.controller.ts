import type { NextFunction, Request, Response } from 'express';
import { and, asc, desc, eq, gt, gte, inArray, like, lt, lte, or, sql } from 'drizzle-orm';
import { getDatabase } from '../config/database.js';
import { categories, products } from '../db/schema.js';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware.js';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDatabase();
    const page = Math.max(1, asNumber(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(req.query.limit, 20)));
    const sort = asString(req.query.sort, 'name');
    const order = asString(req.query.order, 'asc').toLowerCase();
    const offset = (page - 1) * limit;
    const conditions = [eq(products.isActive, true)];

    const categorySlug = asString(req.query.category);
    if (categorySlug) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, categorySlug)).limit(1);
      if (category) {
        conditions.push(eq(products.categoryId, category.id));
      }
    }

    const minPrice = asString(req.query.minPrice);
    if (minPrice) {
      conditions.push(gte(products.price, Number.parseFloat(minPrice)));
    }

    const maxPrice = asString(req.query.maxPrice);
    if (maxPrice) {
      conditions.push(lte(products.price, Number.parseFloat(maxPrice)));
    }

    const requiresPrescription = asString(req.query.requiresPrescription);
    if (requiresPrescription === 'true') {
      conditions.push(eq(products.requiresPrescription, true));
    } else if (requiresPrescription === 'false') {
      conditions.push(eq(products.requiresPrescription, false));
    }

    if (asString(req.query.inStock) === 'true') {
      conditions.push(gt(products.stock, 0));
    }

    const orderBy =
      sort === 'price'
        ? order === 'desc'
          ? desc(products.price)
          : asc(products.price)
        : sort === 'stock'
          ? order === 'desc'
            ? desc(products.stock)
            : asc(products.stock)
          : order === 'desc'
            ? desc(products.name)
            : asc(products.name);

    const data = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        slug: products.slug,
        genericName: products.genericName,
        description: products.description,
        price: products.price,
        stock: products.stock,
        requiresPrescription: products.requiresPrescription,
        expiryDate: products.expiryDate,
        manufacturer: products.manufacturer,
        dosage: products.dosage,
        form: products.form,
        strength: products.strength,
        imageUrl: products.imageUrl,
        isFeatured: products.isFeatured,
        category: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions));

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('[ProductController] getProducts error:', error);
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDatabase();
    const id = asString(req.params.id);
    const isNumeric = /^\d+$/.test(id);

    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          isNumeric ? eq(products.id, Number.parseInt(id, 10)) : eq(products.slug, id),
          eq(products.isActive, true)
        )
      )
      .limit(1);

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('[ProductController] getProduct error:', error);
    next(error);
  }
}

export async function searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDatabase();
    const query = asString(req.query.q).trim();
    if (!query) {
      res.status(400).json({ success: false, message: 'Search query (q) is required' });
      return;
    }

    const limit = Math.min(50, Math.max(1, asNumber(req.query.limit, 10)));
    const searchTerm = `%${query}%`;
    const categorySlug = asString(req.query.category);
    const conditions = [
      eq(products.isActive, true),
      or(
        like(products.name, searchTerm),
        like(products.genericName, searchTerm),
        like(products.description, searchTerm),
        like(products.manufacturer, searchTerm),
        like(products.sku, searchTerm)
      ),
    ];

    if (categorySlug) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, categorySlug)).limit(1);
      if (category) {
        conditions.push(eq(products.categoryId, category.id));
      }
    }

    const data = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        genericName: products.genericName,
        price: products.price,
        stock: products.stock,
        requiresPrescription: products.requiresPrescription,
        category: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(asc(products.name))
      .limit(limit);

    res.json({ success: true, data, count: data.length, query });
  } catch (error) {
    console.error('[ProductController] searchProducts error:', error);
    next(error);
  }
}

export async function getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getDatabase()
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        parentCategoryId: categories.parentCategoryId,
        productCount: sql<number>`count(${products.id})`,
      })
      .from(categories)
      .leftJoin(products, eq(categories.id, products.categoryId))
      .groupBy(categories.id)
      .orderBy(asc(categories.name));

    res.json({ success: true, data });
  } catch (error) {
    console.error('[ProductController] getCategories error:', error);
    next(error);
  }
}

export async function getProductsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDatabase();
    const page = Math.max(1, asNumber(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(req.query.limit, 20)));
    const offset = (page - 1) * limit;

    const [category] = await db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .where(eq(categories.slug, asString(req.params.slug)))
      .limit(1);

    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const conditions = and(eq(products.categoryId, category.id), eq(products.isActive, true));
    const data = await db.select().from(products).where(conditions).orderBy(asc(products.name)).limit(limit).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(products).where(conditions);

    res.json({
      success: true,
      data: {
        category,
        products: data,
        pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getFeaturedProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDatabase();
    const limit = Math.min(50, Math.max(1, asNumber(req.query.limit, 10)));
    let data = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        slug: products.slug,
        genericName: products.genericName,
        description: products.description,
        price: products.price,
        stock: products.stock,
        requiresPrescription: products.requiresPrescription,
        expiryDate: products.expiryDate,
        manufacturer: products.manufacturer,
        dosage: products.dosage,
        form: products.form,
        strength: products.strength,
        imageUrl: products.imageUrl,
        isFeatured: products.isFeatured,
        category: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.isFeatured, true), eq(products.isActive, true)))
      .orderBy(desc(products.stock), asc(products.name))
      .limit(limit);

    if (data.length === 0) {
      data = await db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          slug: products.slug,
          genericName: products.genericName,
          description: products.description,
          price: products.price,
          stock: products.stock,
          requiresPrescription: products.requiresPrescription,
          expiryDate: products.expiryDate,
          manufacturer: products.manufacturer,
          dosage: products.dosage,
          form: products.form,
          strength: products.strength,
          imageUrl: products.imageUrl,
          isFeatured: products.isFeatured,
          category: categories.name,
          categorySlug: categories.slug,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.isActive, true))
        .orderBy(desc(products.stock), asc(products.name))
        .limit(limit);
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('[ProductController] getFeaturedProducts error:', error);
    next(error);
  }
}

export async function checkStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ids = req.query.ids;
    const rawIds = Array.isArray(ids)
      ? ids.filter((value): value is string => typeof value === 'string')
      : typeof ids === 'string'
        ? ids.split(',')
        : [];
    const productIds = rawIds.map((value) => Number.parseInt(value, 10)).filter((value) => Number.isFinite(value));

    if (productIds.length === 0) {
      res.status(400).json({ success: false, message: 'Product IDs are required' });
      return;
    }

    const data = await getDatabase()
      .select({
        id: products.id,
        name: products.name,
        stock: products.stock,
        isActive: products.isActive,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    res.json({ success: true, data });
  } catch (error) {
    console.error('[ProductController] checkStock error:', error);
    next(error);
  }
}

export async function getLowStockProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const threshold = Math.max(1, asNumber(req.query.threshold, 10));
    const data = await getDatabase()
      .select()
      .from(products)
      .where(and(lt(products.stock, threshold), gt(products.stock, 0), eq(products.isActive, true)))
      .orderBy(asc(products.stock));

    res.json({ success: true, data, threshold });
  } catch (error) {
    console.error('[ProductController] getLowStockProducts error:', error);
    next(error);
  }
}

export async function getOutOfStockProducts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getDatabase()
      .select()
      .from(products)
      .where(and(eq(products.stock, 0), eq(products.isActive, true)))
      .orderBy(asc(products.name));

    res.json({ success: true, data });
  } catch (error) {
    console.error('[ProductController] getOutOfStockProducts error:', error);
    next(error);
  }
}

export async function getExpiringSoonProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = Math.max(1, asNumber(req.query.days, 30));
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const future = futureDate.toISOString().slice(0, 10);

    const data = await getDatabase()
      .select()
      .from(products)
      .where(and(eq(products.isActive, true), lt(products.expiryDate, future)))
      .orderBy(asc(products.expiryDate));

    res.json({ success: true, data, days });
  } catch (error) {
    console.error('[ProductController] getExpiringSoonProducts error:', error);
    next(error);
  }
}

export async function adminUpdateStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDatabase();
    const productId = Number.parseInt(asString(req.params.id), 10);
    const { stock } = req.body as Record<string, unknown>;

    if (!Number.isFinite(productId)) {
      throw new BadRequestError('Valid product ID is required');
    }

    const numericStock = Number(stock);
    if (!Number.isFinite(numericStock) || numericStock < 0) {
      throw new BadRequestError('Stock must be a non-negative number');
    }

    const result = await db
      .update(products)
      .set({
        stock: numericStock,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('Product not found');
    }

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: result[0],
    });
  } catch (error) {
    console.error('[ProductController] adminUpdateStock error:', error);
    next(error);
  }
}
