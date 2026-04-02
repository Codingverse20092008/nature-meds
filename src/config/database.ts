import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { env } from './env.js';
import * as schema from '../db/schema.js';

let client: Client | null = null;
let db: LibSQLDatabase<typeof schema> | null = null;

export function getDatabase(): LibSQLDatabase<typeof schema> {
  if (!client) {
    client = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN || undefined,
    });
  }

  if (!db) {
    db = drizzle(client, { schema });
  }

  return db;
}

export function getClient(): Client {
  if (!client) {
    client = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return client;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    client.close();
    client = null;
    db = null;
  }
}
