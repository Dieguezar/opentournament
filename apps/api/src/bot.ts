import type { ApiEnv } from '@opentournament/config';

/**
 * Módulo del bot de Discord (Fase 4).
 * En la Fase 1 solo valida la configuración y queda deshabilitado.
 */
export function startDiscordBot(env: ApiEnv): void {
  if (!env.DISCORD_BOT_TOKEN) {
    console.log('[discord-bot] Sin token; bot deshabilitado.');
    return;
  }
  console.log(
    '[discord-bot] Token detectado; la implementación del bot (gateway, slash, notificaciones) llega en la Fase 4.',
  );
}
