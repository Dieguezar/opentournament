import { createDb } from '@opentournament/database';
import { env } from './config.js';

export const { db, pool } = createDb(env.DATABASE_URL);
