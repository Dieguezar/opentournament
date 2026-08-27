import nodemailer from 'nodemailer';
import { env } from './config.js';

export type MailDeliveryMode = 'smtp' | 'console';

export function getMailDeliveryMode(): MailDeliveryMode {
  return env.SMTP_HOST ? 'smtp' : 'console';
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<MailDeliveryMode> {
  if (getMailDeliveryMode() === 'console') {
    if (env.LOG_LEVEL !== 'silent') {
      console.log(`[mailer:console] To: ${input.to}\nSubject: ${input.subject}\n${input.text}`);
    }
    return 'console';
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  return 'smtp';
}
