import { getClient } from '../config/database.js';
import { hashPassword } from '../utils/security.js';

const ADMIN_EMAIL = 'admin@naturemeds.com';
const ADMIN_PASSWORD = 'admin123';

async function fixAdmin() {
  const client = getClient();

  // Check existing admin
  const result = await client.execute({
    sql: 'SELECT id, email, role, password_hash FROM users WHERE email = ?',
    args: [ADMIN_EMAIL],
  });

  console.log('Current admin user in DB:');
  console.log(JSON.stringify(result.rows, null, 2));

  if (result.rows.length > 0) {
    // Delete existing admin
    await client.execute({
      sql: 'DELETE FROM users WHERE email = ?',
      args: [ADMIN_EMAIL],
    });
    console.log('Deleted existing admin user');
  }

  // Create fresh admin with proper hash
  const passwordHash = hashPassword(ADMIN_PASSWORD);
  console.log('\nGenerated password hash:', passwordHash);

  await client.execute({
    sql: `INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified, is_active)
          VALUES (?, ?, ?, ?, 'admin', 1, 1)`,
    args: [ADMIN_EMAIL, passwordHash, 'Admin', ''],
  });

  console.log('\n✅ Admin user created successfully!');
  console.log('Email:', ADMIN_EMAIL);
  console.log('Password:', ADMIN_PASSWORD);

  // Verify
  const verify = await client.execute({
    sql: 'SELECT id, email, role, password_hash FROM users WHERE email = ?',
    args: [ADMIN_EMAIL],
  });
  console.log('\nVerification - Admin user in DB:');
  console.log(JSON.stringify(verify.rows, null, 2));

  process.exit(0);
}

fixAdmin().catch(console.error);
