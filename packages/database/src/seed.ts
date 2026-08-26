import { loadApiEnv } from '@opentournament/config';
import { createDb } from './client.js';
import { seedDemoData } from './seed-demo.js';

async function main() {
  const env = loadApiEnv();
  if (!env.SEED_DEMO_DATA) {
    console.log('SEED_DEMO_DATA=false; skipping demo data.');
    return;
  }

  const { db, pool } = createDb(env.DATABASE_URL);
  try {
    await seedDemoData(db);

    console.log('Demo seed completed.');
    console.log('  Email: admin@opentournament.local');
    console.log('  Password: demo-password-123');
    console.log('  Organization: opentournament-demo');
    console.log('  Tournament: copa-nexo-demo');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exitCode = 1;
});
