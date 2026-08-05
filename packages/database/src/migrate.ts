import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb } from './client.js';

export async function runMigrations(connectionString: string) {
  const { db, pool } = createDb(connectionString);
  const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url));
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}
