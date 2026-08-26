import Link from 'next/link';
import { formatMessage, getDictionary } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n-server';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const copy = getDictionary(await getRequestLocale()).secondaryFlows;
  const emailSuffix = email ? formatMessage(copy.verificationEmailSuffix, { email }) : '';

  return (
    <main className="container">
      <div className="card">
        <h1>{copy.checkEmail}</h1>
        <p>{formatMessage(copy.verificationSent, { email: emailSuffix })}</p>
        <p className="muted">{copy.verificationExpiry}</p>
        <Link className="button" href="/login">
          {copy.goToSignIn}
        </Link>
      </div>
    </main>
  );
}
