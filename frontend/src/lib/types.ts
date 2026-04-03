export type Product = {
  id: number;
  sku?: string | null;
  name: string;
  slug: string;
  genericName?: string | null;
  description?: string | null;
  price: number;
  stock: number;
  requiresPrescription: boolean;
  expiryDate?: string | null;
  manufacturer?: string | null;
  dosage?: string | null;
  form?: string | null;
  strength?: string | null;
  imageUrl?: string | null;
  isFeatured?: boolean;
  category?: string | null;
  categorySlug?: string | null;
};

export type CartProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  requiresPrescription: boolean;
  category?: string | null;
};

export type CartItem = {
  id: number;
  quantity: number;
  lineTotal: number;
  product: CartProduct;
};

export type Cart = {
  id: number;
  items: CartItem[];
  subtotal: number;
  totalItems: number;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  parentCategoryId?: number | null;
  productCount?: number;
};

export type ImportLog = {
  id: number;
  fileName: string;
  sourceFilePath?: string | null;
  recordType: string;
  importMode?: string;
  overwriteStrategy?: string;
  totalRows: number;
  successCount: number;
  failureCount: number;
  skippedCount?: number;
  status: 'processing' | 'completed' | 'failed';
  errorReport?: {
    generatedAt: string;
    totalErrors: number;
    errors: Array<{
      row: number;
      field: string;
      value: string;
      message: string;
    }>;
  } | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'admin' | 'pharmacist';
  phone?: string | null;
  alternatePhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  language?: string | null;
  isVerified?: boolean;
  createdAt?: string;
};

export type OrderStatus = 'placed' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancel_requested' | 'cancelled' | 'refunded' | 'return_requested' | 'returned' | 'return_rejected';

export type OrderItem = {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  prescriptionRequired: boolean;
  prescriptionId?: number | null;
  createdAt: string;
};

export type Order = {
  id: number;
  orderNumber: string;
  userId: number;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  paymentMethod?: 'card' | 'cod' | 'wallet' | 'upi' | null;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelRequestedAt?: string | null;
  cancelApprovedAt?: string | null;
  returnRequestedAt?: string | null;
  returnApprovedAt?: string | null;
  returnedAt?: string | null;
  returnReason?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  userEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
};

export type AiMedicineReference = {
  id: number;
  name: string;
  slug: string;
  category?: string | null;
  genericName?: string | null;
  description?: string | null;
  manufacturer?: string | null;
  form?: string | null;
  strength?: string | null;
  price: number;
  stock: number;
  requiresPrescription: boolean;
  expiryDate?: string | null;
  source: 'database' | 'csv';
};

export type AiChatResponse = {
  answer: string;
  disclaimer: string;
  references: AiMedicineReference[];
  suggestions: string[];
  personalizationUsed: boolean;
  source: 'model-generated' | 'db-fallback' | 'csv-fallback' | 'clarification' | 'fallback-no-data' | 'cache';
};

export type PaginatedResponse<T> = {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
