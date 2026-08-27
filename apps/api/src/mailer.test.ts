import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createTransport, sendSmtpMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendSmtpMail: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport,
  },
}));

import { env } from './config.js';
import { getMailDeliveryMode, sendMail } from './mailer.js';

const originalSmtpHost = env.SMTP_HOST;

describe('mailer delivery modes', () => {
  beforeEach(() => {
    createTransport.mockReset();
    sendSmtpMail.mockReset();
    createTransport.mockReturnValue({ sendMail: sendSmtpMail });
  });

  afterEach(() => {
    env.SMTP_HOST = originalSmtpHost;
    vi.restoreAllMocks();
  });

  it('returns console without creating an SMTP transport when SMTP is disabled', async () => {
    env.SMTP_HOST = undefined;
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(getMailDeliveryMode()).toBe('console');
    await expect(
      sendMail({ to: 'person@example.com', subject: 'Subject', text: 'Private link' }),
    ).resolves.toBe('console');
    expect(createTransport).not.toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('[mailer:console]'));
  });

  it('returns smtp only after the configured transport accepts the message', async () => {
    env.SMTP_HOST = 'mail.example.com';
    sendSmtpMail.mockResolvedValue({ messageId: 'message-1' });

    expect(getMailDeliveryMode()).toBe('smtp');
    await expect(
      sendMail({ to: 'person@example.com', subject: 'Subject', text: 'Private link' }),
    ).resolves.toBe('smtp');
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'mail.example.com', disableFileAccess: true }),
    );
    expect(sendSmtpMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'person@example.com', subject: 'Subject' }),
    );
  });
});
