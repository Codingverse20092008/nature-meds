import { getDatabase } from '../src/config/database.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function listAdmins() {
  try {
    const db = getDatabase();
    console.log('Finding admins in database...');
    
    // Find users with admin role
    const admins = await db.select({
      email: users.email,
      role: users.role,
      firstName: users.firstName
    }).from(users).where(eq(users.role, 'admin'));
    
    if (admins.length > 0) {
      console.log('Found the following administrators:');
      admins.forEach(admin => {
        console.log(`- Email: ${admin.email} (Name: ${admin.firstName})`);
      });
    } else {
      console.log('No administrator accounts found in the database.');
    }
    process.exit(0);
  } catch (error) {
    console.error('Failed to query admins:', error);
    process.exit(1);
  }
}

listAdmins();
