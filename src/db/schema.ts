import { sqliteTable, text, integer, real, index, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Categories table
export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    parentCategoryId: integer('parent_category_id').references((): any => categories.id),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nameIdx: index('categories_name_idx').on(table.name),
    slugIdx: index('categories_slug_idx').on(table.slug),
  })
);

// Products table (medicines)
export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sku: text('sku').unique(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    genericName: text('generic_name'),
    categoryId: integer('category_id').references(() => categories.id),
    description: text('description'),
    price: real('price').notNull(),
    stock: integer('stock').notNull().default(0),
    requiresPrescription: integer('requires_prescription', { mode: 'boolean' }).notNull().default(false),
    expiryDate: text('expiry_date'),
    manufacturer: text('manufacturer'),
    dosage: text('dosage'),
    form: text('form'), // tablet, capsule, syrup, injection, etc.
    strength: text('strength'),
    imageUrl: text('image_url'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    skuIdx: index('products_sku_idx').on(table.sku),
    nameIdx: index('products_name_idx').on(table.name),
    genericNameIdx: index('products_generic_name_idx').on(table.genericName),
    slugIdx: index('products_slug_idx').on(table.slug),
    categoryIdx: index('products_category_idx').on(table.categoryId),
    priceIdx: index('products_price_idx').on(table.price),
    stockIdx: index('products_stock_idx').on(table.stock),
    manufacturerIdx: index('products_manufacturer_idx').on(table.manufacturer),
    prescriptionIdx: index('products_prescription_idx').on(table.requiresPrescription),
    activeIdx: index('products_active_idx').on(table.isActive),
    expiryIdx: index('products_expiry_idx').on(table.expiryDate),
    uniqueName: unique('products_unique_name').on(table.name, table.categoryId),
  })
);

// Users table
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone'),
    alternatePhone: text('alternate_phone'),
    role: text('role', { enum: ['customer', 'admin', 'pharmacist'] })
      .notNull()
      .default('customer'),
    address: text('address'),
    city: text('city'),
    state: text('state'),
    zipCode: text('zip_code'),
    country: text('country').default('India'),
    isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    language: text('language').default('en'),
    lastLoginAt: text('last_login_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    roleIdx: index('users_role_idx').on(table.role),
  })
);

// Prescriptions table
export const prescriptions = sqliteTable(
  'prescriptions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    prescriptionNumber: text('prescription_number').notNull().unique(),
    doctorName: text('doctor_name').notNull(),
    doctorLicense: text('doctor_license'),
    clinicName: text('clinic_name'),
    issueDate: text('issue_date').notNull(),
    expiryDate: text('expiry_date'),
    notes: text('notes'),
    imageUrl: text('image_url'),
    status: text('status', { enum: ['pending', 'approved', 'rejected', 'expired'] })
      .notNull()
      .default('pending'),
    reviewedBy: integer('reviewed_by').references(() => users.id),
    reviewedAt: text('reviewed_at'),
    rejectionReason: text('rejection_reason'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index('prescriptions_user_idx').on(table.userId),
    numberIdx: index('prescriptions_number_idx').on(table.prescriptionNumber),
    statusIdx: index('prescriptions_status_idx').on(table.status),
    expiryIdx: index('prescriptions_expiry_idx').on(table.expiryDate),
  })
);

// Orders table
export const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderNumber: text('order_number').notNull().unique(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    prescriptionId: integer('prescription_id').references(() => prescriptions.id, { onDelete: 'set null' }),
    status: text('status', {
      enum: ['placed', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancel_requested', 'cancelled', 'refunded'],
    })
      .notNull()
      .default('placed'),
    subtotal: real('subtotal').notNull(),
    tax: real('tax').notNull().default(0),
    shippingCost: real('shipping_cost').notNull().default(0),
    discount: real('discount').notNull().default(0),
    total: real('total').notNull(),
    paymentMethod: text('payment_method', { enum: ['card', 'cod', 'wallet', 'upi'] }),
    paymentStatus: text('payment_status', { enum: ['pending', 'paid', 'failed', 'refunded'] })
      .notNull()
      .default('pending'),
    shippingAddress: text('shipping_address').notNull(),
    shippingCity: text('shipping_city').notNull(),
    shippingState: text('shipping_state').notNull(),
    shippingZip: text('shipping_zip').notNull(),
    shippingCountry: text('shipping_country').default('India'),
    trackingNumber: text('tracking_number'),
    shippedAt: text('shipped_at'),
    deliveredAt: text('delivered_at'),
    cancelledAt: text('cancelled_at'),
    cancellationReason: text('cancellation_reason'),
    cancelRequestedAt: text('cancel_requested_at'),
    cancelApprovedAt: text('cancel_approved_at'),
    notes: text('notes'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    orderNumberIdx: index('orders_number_idx').on(table.orderNumber),
    userIdIdx: index('orders_user_idx').on(table.userId),
    statusIdx: index('orders_status_idx').on(table.status),
    paymentStatusIdx: index('orders_payment_status_idx').on(table.paymentStatus),
    createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  })
);

export const emailVerificationTokens = sqliteTable(
  'email_verification_tokens',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index('email_verification_tokens_user_idx').on(table.userId),
    tokenIdx: index('email_verification_tokens_token_idx').on(table.token),
    expiresAtIdx: index('email_verification_tokens_expires_at_idx').on(table.expiresAt),
  })
);

// Order items table
export const orderItems = sqliteTable(
  'order_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productName: text('product_name').notNull(),
    sku: text('sku'),
    quantity: integer('quantity').notNull(),
    unitPrice: real('unit_price').notNull(),
    totalPrice: real('total_price').notNull(),
    prescriptionRequired: integer('prescription_required', { mode: 'boolean' }).notNull().default(false),
    prescriptionId: integer('prescription_id').references(() => prescriptions.id),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    orderIdIdx: index('order_items_order_idx').on(table.orderId),
    productIdIdx: index('order_items_product_idx').on(table.productId),
  })
);

// Cart table
export const carts = sqliteTable(
  'carts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').unique(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    expiresAt: text('expires_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index('carts_user_idx').on(table.userId),
    sessionIdIdx: index('carts_session_idx').on(table.sessionId),
  })
);

// Cart items table
export const cartItems = sqliteTable(
  'cart_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cartId: integer('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    cartIdIdx: index('cart_items_cart_idx').on(table.cartId),
    productIdIdx: index('cart_items_product_idx').on(table.productId),
    uniqueCartProduct: unique('cart_items_unique').on(table.cartId, table.productId),
  })
);

// Import logs table for tracking CSV imports
export const importLogs = sqliteTable(
  'import_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fileName: text('file_name').notNull(),
    sourceFilePath: text('source_file_path'),
    recordType: text('record_type').notNull(),
    importMode: text('import_mode').notNull().default('upsert'),
    overwriteStrategy: text('overwrite_strategy').notNull().default('update_existing'),
    totalRows: integer('total_rows').notNull(),
    successCount: integer('success_count').notNull().default(0),
    failureCount: integer('failure_count').notNull().default(0),
    skippedCount: integer('skipped_count').notNull().default(0),
    status: text('status', { enum: ['processing', 'completed', 'failed'] })
      .notNull()
      .default('processing'),
    errorReport: text('error_report'), // JSON string of errors
    metadata: text('metadata'),
    processedBy: integer('processed_by').references(() => users.id),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    createdAtIdx: index('import_logs_created_idx').on(table.createdAt),
    statusIdx: index('import_logs_status_idx').on(table.status),
    recordTypeIdx: index('import_logs_record_type_idx').on(table.recordType),
  })
);

// AI chat logs for observability
export const aiChatLogs = sqliteTable(
  'ai_chat_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionKey: text('session_key').notNull(),
    query: text('query').notNull(),
    normalizedQuery: text('normalized_query').notNull(),
    contextMedicines: text('context_medicines').notNull(),
    contextSource: text('context_source', { enum: ['database', 'csv', 'none', 'mixed'] }).notNull(),
    responseText: text('response_text').notNull(),
    responseSource: text('response_source', {
      enum: ['model-generated', 'db-fallback', 'csv-fallback', 'clarification', 'fallback-no-data', 'cache'],
    }).notNull(),
    responseTimeMs: integer('response_time_ms').notNull(),
    safetyStatus: text('safety_status', { enum: ['passed', 'corrected', 'rejected'] }).notNull(),
    fallbackReason: text('fallback_reason'),
    metadata: text('metadata'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdx: index('ai_chat_logs_user_idx').on(table.userId),
    sessionIdx: index('ai_chat_logs_session_idx').on(table.sessionKey),
    createdAtIdx: index('ai_chat_logs_created_idx').on(table.createdAt),
    responseSourceIdx: index('ai_chat_logs_response_source_idx').on(table.responseSource),
  })
);

// Lightweight chat memory
export const aiChatMessages = sqliteTable(
  'ai_chat_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionKey: text('session_key').notNull(),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    metadata: text('metadata'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdx: index('ai_chat_messages_user_idx').on(table.userId),
    sessionIdx: index('ai_chat_messages_session_idx').on(table.sessionKey),
    createdAtIdx: index('ai_chat_messages_created_idx').on(table.createdAt),
  })
);

// Type exports
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
export type ImportLog = typeof importLogs.$inferSelect;
export type NewImportLog = typeof importLogs.$inferInsert;
export type AiChatLog = typeof aiChatLogs.$inferSelect;
export type NewAiChatLog = typeof aiChatLogs.$inferInsert;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type NewAiChatMessage = typeof aiChatMessages.$inferInsert;
