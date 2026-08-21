import nodemailer from 'nodemailer';
import { env } from './config.js';

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
      disableFileAccess: true,
      disableUrlAccess: true,
    })
  : null;

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!transporter) {
    if (env.LOG_LEVEL !== 'silent') {
      console.log(`[mailer:consola] Para: ${input.to}\nAsunto: ${input.subject}\n${input.text}`);
    }
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
}
