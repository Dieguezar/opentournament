import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export type Db = ReturnType<typeof createDb>['db'];
export type DbTransaction = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbExecutor = Db | DbTransaction;
export type PoolClient = Pool;

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString, max: 10 });
  return {
    db: drizzle(pool, { schema }),
    pool,
  };
}

export { schema };
