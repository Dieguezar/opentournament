import { runMigrations } from '@opentournament/database';
import { env } from './config.js';
import { db, pool } from './db.js';
import { initServer } from './app.js';
import { startScheduler } from './worker.js';
import { startDiscordBot } from './bot.js';

async function main() {
  console.log('Aplicando migraciones…');
  await runMigrations(env.DATABASE_URL);

  const app = await initServer();
  const scheduler = startScheduler(db);
  startDiscordBot(env);

  const shutdown = async (signal: string) => {
    app.log.info(`Recibido ${signal}; cerrando…`);
    scheduler.stop();
    await app.close();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`API de OpenTournament escuchando en ${env.HOST}:${env.PORT}`);
}

main().catch((err) => {
  console.error('No se pudo iniciar la API:', err);
  process.exit(1);
});
