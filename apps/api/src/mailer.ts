import { env } from './config.js';

/**
 * Fase 1: mailer en modo consola (AF-02).
 * Si SMTP se configura en una fase posterior, este módulo se extiende
 * sin cambiar los llamadores.
 */
export function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): void {
  if (!env.SMTP_HOST) {
    if (env.LOG_LEVEL !== 'silent') {
      console.log(`[mailer:consola] Para: ${input.to}\nAsunto: ${input.subject}\n${input.text}`);
    }
    return;
  }
  // TODO(fase 3): transporte SMTP real (nodemailer u otro).
  console.log(`[mailer] SMTP configurado pero el envío real llega en fase 3. Para: ${input.to}`);
}

export function hasSmtp(): boolean {
  return Boolean(env.SMTP_HOST);
}
