import type { NextFunction, Request, Response } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDatabase } from '../config/database.js';
import { cartItems, carts, orders, orderItems, products, type NewOrder, users } from '../db/schema.js';
import { HttpError, BadRequestError, NotFoundError } from '../middleware/error.middleware.js';
import { sendOrderConfirmationEmail } from '../services/email.service.js';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

type OrderStatus = typeof orders.$inferSelect.status;

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Create a new order
 */
export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const {
      items,
      prescriptionId,
      shippingAddress,
      shippingCity,
      shippingState,
      shippingZip,
      paymentMethod = 'cod',
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Order items are required');
    }

    if (!shippingAddress || !shippingCity || !shippingState || !shippingZip) {
      throw new BadRequestError('Complete shipping address is required');
    }

    // Validate products and check stock
    let subtotal = 0;
    const orderItemsData: Array<Omit<typeof orderItems.$inferInsert, 'orderId'>> = [];

    for (const item of items) {
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (product.length === 0) {
        throw new NotFoundError(`Product not found: ${item.productId}`);
      }

      const productData = product[0];

      if (!productData.isActive) {
        throw new BadRequestError(`Product ${productData.name} is not available`);
      }

      if (productData.stock < item.quantity) {
        throw new BadRequestError(`Insufficient stock for ${productData.name}`);
      }

      // Check prescription requirement
      if (productData.requiresPrescription && !prescriptionId) {
        throw new BadRequestError(
          `Product ${productData.name} requires a prescription`
        );
      }

      const itemTotal = productData.price * item.quantity;
      subtotal += itemTotal;

      orderItemsData.push({
        productId: productData.id,
        productName: productData.name,
        sku: productData.sku,
        quantity: Number(item.quantity),
        unitPrice: productData.price,
        totalPrice: itemTotal,
        prescriptionRequired: productData.requiresPrescription,
        prescriptionId: typeof prescriptionId === 'number' ? prescriptionId : null,
      });
    }

    // Calculate totals for India COD checkout
    const tax = 0;
    const shippingCost = subtotal >= 299 ? 0 : 20;
    const discount = 0;
    const total = subtotal + tax + shippingCost - discount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create order
    const newOrder: NewOrder = {
      orderNumber,
      userId: authReq.user.id,
      prescriptionId: typeof prescriptionId === 'number' ? prescriptionId : null,
      status: 'placed',
      subtotal,
      tax,
      shippingCost,
      discount,
      total,
      paymentMethod: ['card', 'cod', 'wallet', 'upi'].includes(asString(paymentMethod))
        ? (paymentMethod as 'card' | 'cod' | 'wallet' | 'upi')
        : 'cod',
      paymentStatus: 'pending',
      shippingAddress: asString(shippingAddress),
      shippingCity: asString(shippingCity),
      shippingState: asString(shippingState),
      shippingZip: asString(shippingZip),
      shippingCountry: 'India',
    };

    const orderResult = await db.insert(orders).values(newOrder).returning();
    const createdOrder = orderResult[0];

    // Create order items
    for (const itemData of orderItemsData) {
      await db.insert(orderItems).values({
        ...itemData,
        orderId: createdOrder.id,
      });
    }

    // Atomic update product stock
    for (const item of items) {
      await db
        .update(products)
        .set({ 
          stock: sql`${products.stock} - ${Number(item.quantity)}`,
          updatedAt: new Date().toISOString()
        })
        .where(eq(products.id, item.productId));
    }

    // Clear active cart after successful order placement
    const activeCart = await db
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.userId, authReq.user.id), eq(carts.isActive, true)))
      .limit(1);

    if (activeCart.length > 0) {
      await db.delete(cartItems).where(eq(cartItems.cartId, activeCart[0].id));
      await db
        .update(carts)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(carts.id, activeCart[0].id));
    }

    const [user] = await db
      .select({
        email: users.email,
        firstName: users.firstName,
      })
      .from(users)
      .where(eq(users.id, authReq.user.id))
      .limit(1);

    if (user) {
      await sendOrderConfirmationEmail({
        email: user.email,
        firstName: user.firstName,
        order: createdOrder,
        items: orderItemsData.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
        })),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        ...createdOrder,
        items: orderItemsData,
      },
    });
  } catch (error) {
    console.error('[OrderController] createOrder error:', error);
    next(error);
  }
}

/**
 * Get user's orders
 */
export async function getUserOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const page = Math.max(1, Number.parseInt(asString(req.query.page, '1'), 10));
    const limit = Math.min(50, Math.max(1, Number.parseInt(asString(req.query.limit, '10'), 10)));
    const status = asString(req.query.status);
    const offset = (page - 1) * limit;

    const conditions = [eq(orders.userId, authReq.user.id)];

    if (status) {
      conditions.push(eq(orders.status, status as OrderStatus));
    }

    const orderList = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(...conditions));

    // Get items for each order
    const ordersWithItems = await Promise.all(
      orderList.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return { ...order, items };
      })
    );

    res.json({
      success: true,
      data: ordersWithItems,
      pagination: {
        page,
        limit,
        total: countResult[0]?.count || 0,
        totalPages: Math.ceil((countResult[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[OrderController] getUserOrders error:', error);
    next(error);
  }
}

/**
 * Get single order by ID
 */
export async function getOrderById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const orderId = Number.parseInt(asString(req.params.id), 10);

    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) {
      throw new NotFoundError('Order not found');
    }

    // Check authorization (user can only see their own orders, admin can see all)
    if (authReq.user.role !== 'admin' && order[0].userId !== authReq.user.id) {
      throw new HttpError(403, 'Not authorized to view this order');
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    res.json({
      success: true,
      data: { ...order[0], items },
    });
  } catch (error) {
    console.error('[OrderController] getOrderById error:', error);
    next(error);
  }
}

/**
 * Update order status (admin/pharmacist)
 */
export async function updateOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const { status, trackingNumber, cancellationReason, notes } = req.body as Record<string, unknown>;
    const orderId = Number.parseInt(asString(req.params.id), 10);

    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) {
      throw new NotFoundError('Order not found');
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (status) {
      updateData.status = asString(status);

      // Set timestamps based on status
      if (status === 'shipped') {
        updateData.shippedAt = new Date().toISOString();
        if (trackingNumber) {
          updateData.trackingNumber = asString(trackingNumber);
        }
      } else if (status === 'delivered') {
        updateData.deliveredAt = new Date().toISOString();
      } else if (status === 'cancelled') {
        updateData.cancelledAt = new Date().toISOString();
        if (cancellationReason) {
          updateData.cancellationReason = asString(cancellationReason);
        }
        // Restore stock for cancelled orders
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, orderId));

        for (const item of items) {
          await db
            .update(products)
            .set({ stock: sql`${products.stock} + ${item.quantity}` })
            .where(eq(products.id, item.productId));
        }
      }
    }

    if (notes) {
      updateData.notes = asString(notes);
    }

    const result = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: result[0],
    });
  } catch (error) {
    console.error('[OrderController] updateOrderStatus error:', error);
    next(error);
  }
}

/**
 * Get all orders (admin)
 */
export async function getAllOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const page = Math.max(1, Number.parseInt(asString(req.query.page, '1'), 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(asString(req.query.limit, '20'), 10)));
    const status = asString(req.query.status);
    const startDate = asString(req.query.startDate);
    const endDate = asString(req.query.endDate);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (status) {
      conditions.push(eq(orders.status, status as OrderStatus));
    }

    if (startDate) {
      conditions.push(sql`${orders.createdAt} >= ${startDate}`);
    }

    if (endDate) {
      conditions.push(sql`${orders.createdAt} <= ${endDate}`);
    }

    const orderList = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
        shippingAddress: orders.shippingAddress,
        shippingCity: orders.shippingCity,
        shippingState: orders.shippingState,
        shippingZip: orders.shippingZip,
        firstName: users.firstName,
        lastName: users.lastName,
        userEmail: users.email,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({
      success: true,
      data: orderList,
      pagination: {
        page,
        limit,
        total: countResult[0]?.count || 0,
        totalPages: Math.ceil((countResult[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[OrderController] getAllOrders error:', error);
    next(error);
  }
}

/**
 * Get order statistics (admin)
 */
export async function getOrderStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();

    const stats = await db
      .select({
        totalOrders: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`SUM(${orders.total})`,
        placedOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'placed' THEN 1 END)`,
        pendingOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'pending' THEN 1 END)`,
        processingOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'processing' THEN 1 END)`,
        shippedOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'shipped' THEN 1 END)`,
        deliveredOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'delivered' THEN 1 END)`,
        cancelledOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'cancelled' THEN 1 END)`,
      })
      .from(orders)
      .limit(1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await db
      .select({
        orders: sql<number>`COUNT(*)`,
        revenue: sql<number>`SUM(${orders.total})`,
      })
      .from(orders)
      .where(sql`${orders.createdAt} >= ${today.toISOString()}`)
      .limit(1);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          placedOrders: 0,
          pendingOrders: 0,
          processingOrders: 0,
          shippedOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
        },
        today: todayStats[0] || { orders: 0, revenue: 0 },
      },
    });
  } catch (error) {
    console.error('[OrderController] getOrderStats error:', error);
    next(error);
  }
}

/**
 * Request order cancellation (user)
 */
export async function cancelRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const { reason } = req.body as Record<string, unknown>;
    const orderId = Number.parseInt(asString(req.params.id), 10);

    const order = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, authReq.user.id)))
      .limit(1);

    if (order.length === 0) {
      throw new NotFoundError('Order not found');
    }

    if (!['placed', 'confirmed', 'pending'].includes(order[0].status)) {
      throw new BadRequestError('Cannot request cancellation for this order');
    }

    await db
      .update(orders)
      .set({
        status: 'cancel_requested',
        cancellationReason: asString(reason) || null,
        cancelRequestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.id, orderId));

    res.json({
      success: true,
      message: 'Cancellation request submitted successfully',
    });
  } catch (error) {
    console.error('[OrderController] cancelRequest error:', error);
    next(error);
  }
}

/**
 * Approve order cancellation (admin)
 */
export async function approveCancel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const orderId = Number.parseInt(asString(req.params.id), 10);

    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) {
      throw new NotFoundError('Order not found');
    }

    if (order[0].status !== 'cancel_requested') {
      throw new BadRequestError('No pending cancellation request for this order');
    }

    await db
      .update(orders)
      .set({
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelApprovedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.id, orderId));

    // Restore stock
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    for (const item of items) {
      await db
        .update(products)
        .set({ stock: sql`${products.stock} + ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }

    res.json({
      success: true,
      message: 'Cancellation approved successfully',
    });
  } catch (error) {
    console.error('[OrderController] approveCancel error:', error);
    next(error);
  }
}

/**
 * Reject order cancellation (admin)
 */
export async function rejectCancel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const orderId = Number.parseInt(asString(req.params.id), 10);

    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) {
      throw new NotFoundError('Order not found');
    }

    if (order[0].status !== 'cancel_requested') {
      throw new BadRequestError('No pending cancellation request for this order');
    }

    await db
      .update(orders)
      .set({
        status: 'confirmed',
        cancelRequestedAt: null,
        cancellationReason: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.id, orderId));

    res.json({
      success: true,
      message: 'Cancellation request rejected',
    });
  } catch (error) {
    console.error('[OrderController] rejectCancel error:', error);
    next(error);
  }
}

/**
 * Request order return (user)
 */
export async function requestReturn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const authReq = req as AuthRequest;
    const orderId = Number.parseInt(asString(req.params.id), 10);
    const { reason } = req.body;

    if (!reason) {
      throw new BadRequestError('Return reason is required');
    }

    const order = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, authReq.user!.id)))
      .limit(1);

    if (order.length === 0) {
      throw new NotFoundError('Order not found');
    }

    if (order[0].status !== 'delivered') {
      throw new BadRequestError('Only delivered orders can be returned');
    }

    // Check if 48 hours have passed (Return Policy)
    const deliveredAt = order[0].deliveredAt ? new Date(order[0].deliveredAt) : new Date(order[0].updatedAt);
    const now = new Date();
    const hoursSinceDelivery = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceDelivery > 48) {
      throw new BadRequestError('Returns are only allowed within 48 hours of delivery');
    }

    await db
      .update(orders)
      .set({
        status: 'return_requested',
        returnReason: asString(reason),
        returnRequestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.id, orderId));

    res.json({
      success: true,
      message: 'Return request submitted successfully. We will review it within 24-48 hours.',
    });
  } catch (error) {
    console.error('[OrderController] requestReturn error:', error);
    next(error);
  }
}

/**
 * Approve order return (admin)
 */
export async function approveReturn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const orderId = Number.parseInt(asString(req.params.id), 10);

    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) {
      throw new NotFoundError('Order not found');
    }

    if (order[0].status !== 'return_requested') {
      throw new BadRequestError('No pending return request for this order');
    }

    await db
      .update(orders)
      .set({
        status: 'returned',
        returnedAt: new Date().toISOString(),
        returnApprovedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.id, orderId));

    // Restore stock if it was a valid physical return
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    for (const item of items) {
      await db
        .update(products)
        .set({ stock: sql`${products.stock} + ${Number(item.quantity)}` })
        .where(eq(products.id, item.productId));
    }

    res.json({
      success: true,
      message: 'Return approved and stock restored',
    });
  } catch (error) {
    console.error('[OrderController] approveReturn error:', error);
    next(error);
  }
}

/**
 * Reject order return (admin)
 */
export async function rejectReturn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDatabase();
    const orderId = Number.parseInt(asString(req.params.id), 10);
    const { reason } = req.body;

    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) {
      throw new NotFoundError('Order not found');
    }

    if (order[0].status !== 'return_requested') {
      throw new BadRequestError('No pending return request for this order');
    }

    await db
      .update(orders)
      .set({
        status: 'return_rejected',
        notes: reason ? `Return Rejected: ${reason}` : 'Return Rejected by administrator',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.id, orderId));

    res.json({
      success: true,
      message: 'Return request rejected',
    });
  } catch (error) {
    console.error('[OrderController] rejectReturn error:', error);
    next(error);
  }
}

