import { getClient } from './database.js';
import { hashPassword } from '../utils/security.js';

const REQUIRED_TABLES = [
  'categories',
  'products',
  'users',
  'orders',
  'order_items',
  'email_verification_tokens',
  'prescriptions',
  'carts',
  'cart_items',
  'import_logs',
  'ai_chat_logs',
  'ai_chat_messages',
] as const;

const ADMIN_EMAIL = 'admin@naturemeds.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'Admin';

export async function ensureDatabaseReady(): Promise<void> {
  const client = getClient();
  const placeholders = REQUIRED_TABLES.map(() => '?').join(', ');
  const result = await client.execute({
    sql: `select name from sqlite_master where type = 'table' and name in (${placeholders})`,
    args: [...REQUIRED_TABLES],
  });

  const availableTables = new Set(
    result.rows.map((row) => String(row.name))
  );
  const missingTables = REQUIRED_TABLES.filter((table) => !availableTables.has(table));

  if (missingTables.length > 0) {
    throw new Error(
      `Database schema is not initialized. Missing tables: ${missingTables.join(', ')}. Run "npm run migrate" before starting the server.`
    );
  }
}

export async function ensureAdminUser(): Promise<void> {
  const client = getClient();

  // Check if admin user exists
  const result = await client.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [ADMIN_EMAIL],
  });

  if (result.rows.length === 0) {
    // Create admin user with hashed password
    const passwordHash = hashPassword(ADMIN_PASSWORD);
    await client.execute({
      sql: `INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified, is_active)
            VALUES (?, ?, ?, ?, 'admin', 1, 1)`,
      args: [ADMIN_EMAIL, passwordHash, ADMIN_NAME, ''],
    });
    console.log('✅ Admin user created successfully');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log('   Password: admin123 (please change after first login)');
  }
}
