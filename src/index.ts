import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { getDatabase } from './config/database.js';
import { ensureDatabaseReady, ensureAdminUser } from './config/startup.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

// Import routes
import productsRoutes from './routes/products.routes.js';
import csvRoutes from './routes/csv.routes.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import cartRoutes from './routes/cart.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import aiRoutes from './routes/ai.routes.js';

// Create Express application
const app: Application = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: function (_origin, callback) {
    // Allow any origin - necessary for dynamic Vercel domains
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/v1', limiter);

// Root route for better UX
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is running 🚀',
  });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/csv', csvRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/ai', aiRoutes);

// API documentation route
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Nature Meds API',
    version: '1.0.0',
    endpoints: {
      products: {
        list: 'GET /api/v1/products',
        search: 'GET /api/v1/products/search?q=query',
        byId: 'GET /api/v1/products/:id',
        categories: 'GET /api/v1/products/categories',
        byCategory: 'GET /api/v1/products/categories/:slug',
        featured: 'GET /api/v1/products/featured',
      },
      users: {
        register: 'POST /api/v1/users/register',
        login: 'POST /api/v1/users/login',
        verifyEmail: 'POST /api/v1/users/verify-email',
        resendVerification: 'POST /api/v1/users/resend-verification',
        profile: 'GET /api/v1/users/me',
        updateProfile: 'PUT /api/v1/users/me',
        changePassword: 'POST /api/v1/users/me/change-password',
        allUsers: 'GET /api/v1/users (admin)',
        deleteUser: 'DELETE /api/v1/users/:id (admin)',
      },
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        verifyEmail: 'POST /api/v1/auth/verify-email',
        resendVerification: 'POST /api/v1/auth/resend-verification',
      },
      cart: {
        get: 'GET /api/v1/cart',
        add: 'POST /api/v1/cart/items',
        update: 'PUT /api/v1/cart/items/:productId',
        remove: 'DELETE /api/v1/cart/items/:productId',
        sync: 'POST /api/v1/cart/sync',
      },
      orders: {
        create: 'POST /api/v1/orders',
        history: 'GET /api/v1/orders',
        detail: 'GET /api/v1/orders/:id',
        cancel: 'POST /api/v1/orders/:id/cancel',
        adminList: 'GET /api/v1/orders/admin/list (admin)',
        adminStatus: 'PATCH /api/v1/orders/:id/status (admin)',
      },
      ai: {
        chat: 'POST /api/v1/ai/chat',
      },
      csv: {
        upload: 'POST /api/v1/csv/upload (admin)',
        validate: 'POST /api/v1/csv/validate (admin)',
        template: 'GET /api/v1/csv/template (admin)',
        logs: 'GET /api/v1/csv/logs (admin)',
        logDetails: 'GET /api/v1/csv/logs/:id (admin)',
        retry: 'POST /api/v1/csv/retry/:id (admin)',
        stats: 'GET /api/v1/csv/stats (admin)',
      },
      inventoryAdmin: {
        lowStock: 'GET /api/v1/products/admin/low-stock (admin)',
        outOfStock: 'GET /api/v1/products/admin/out-of-stock (admin)',
        expiringSoon: 'GET /api/v1/products/admin/expiring-soon (admin)',
      },
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Database initialization and server start
async function startServer(): Promise<void> {
  try {
    // Initialize database connection
    getDatabase();
    await ensureDatabaseReady();
    console.log('✅ Database connected');

    // Ensure admin user exists
    await ensureAdminUser();

    // Start server
    const PORT = parseInt(env.PORT, 10);
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║             🌿 Nature Meds API Server                     ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on port: ${PORT}
║  Environment: ${env.NODE_ENV}
║  Database: ${env.TURSO_DATABASE_URL}
║                                                             ║
║  API Base URL: http://localhost:${PORT}/api/v1
║  Health Check: http://localhost:${PORT}/health
║                                                             ║
║  Endpoints:                                                 ║
║  - GET  /api/v1/products           - List products          ║
║  - GET  /api/v1/products/search    - Search medicines       ║
║  - GET  /api/v1/products/categories - Get categories       ║
║  - POST /api/v1/csv/upload         - Upload CSV (admin)     ║
║  - GET  /api/v1/csv/template       - Download template      ║
║  - POST /api/v1/users/register     - Register user          ║
║  - POST /api/v1/users/login        - Login user             ║
║  - POST /api/v1/auth/verify-email  - Verify user email      ║
║  - GET  /api/v1/users/me           - Get profile            ║
║  - POST /api/v1/orders             - Place order            ║
║  - POST /api/v1/ai/chat            - Nature Med Coach       ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    if (error instanceof Error && error.message.includes('Database schema is not initialized')) {
      console.error('➡️ Run "npm run migrate" and then restart the server.');
    }
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  const { closeDatabase } = await import('./config/database.js');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  const { closeDatabase } = await import('./config/database.js');
  await closeDatabase();
  process.exit(0);
});

// Start the server
startServer();

export default app;
