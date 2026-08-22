import { loadApiEnv } from '@opentournament/config';
import { createDb } from './client.js';
import { seedDemoData } from './seed-demo.js';

async function main() {
  const env = loadApiEnv();
  if (!env.SEED_DEMO_DATA) {
    console.log('SEED_DEMO_DATA=false; no se ejecuta el seed de demostración.');
    return;
  }

  const { db, pool } = createDb(env.DATABASE_URL);
  try {
    await seedDemoData(db);

    console.log('Seed de demostración completado.');
    console.log('  Correo: admin@opentournament.local');
    console.log('  Contraseña: demo-password-123');
    console.log('  Organización: opentournament-demo');
    console.log('  Torneo: copa-nexo-demo');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error ejecutando el seed:', err);
  process.exitCode = 1;
});
