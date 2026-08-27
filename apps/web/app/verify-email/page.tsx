import Link from 'next/link';
import { formatMessage, getDictionary } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n-server';
import { ResendVerificationButton } from './resend-verification-button';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; delivery?: string }>;
}) {
  const { email, delivery } = await searchParams;
  const copy = getDictionary(await getRequestLocale()).secondaryFlows;
  const emailSuffix = email ? formatMessage(copy.verificationEmailSuffix, { email }) : '';
  const usesConsoleDelivery = delivery === 'console';

  return (
    <main className="container">
      <div className="card">
        <h1>{usesConsoleDelivery ? copy.consoleVerificationTitle : copy.checkEmail}</h1>
        <p>
          {usesConsoleDelivery
            ? copy.consoleVerificationInstructions
            : formatMessage(copy.verificationSent, { email: emailSuffix })}
        </p>
        <p className="muted">{copy.verificationExpiry}</p>
        {email && <ResendVerificationButton email={email} />}
        <Link className="button" href="/login">
          {copy.goToSignIn}
        </Link>
      </div>
    </main>
  );
}
