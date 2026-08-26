import Link from 'next/link';
import { getAuthSession } from '@/lib/auth-session';
import { getDictionary } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n-server';
import { getHomePresentation } from '@/lib/participant-experience';

export default async function HomePage() {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  const { status, data } = await getAuthSession();
  const user = status === 200 ? data.user : null;
  const presentation = user
    ? getHomePresentation({ user, participantAccess: data.participantAccess ?? null }, locale)
    : null;

  return (
    <main className="container">
      <h1>OpenTournament</h1>
      <p className="muted">{dictionary.home.tagline}</p>
      <div className="card">
        {presentation ? (
          <>
            <p className="eyebrow">{presentation.eyebrow}</p>
            <h2>{presentation.title}</h2>
            <p>{presentation.description}</p>
            <div className="actions">
              <Link className="button" href={presentation.primaryAction.href}>
                {presentation.primaryAction.label}
              </Link>
              <Link className="button button-secondary" href={presentation.secondaryAction.href}>
                {presentation.secondaryAction.label}
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2>{dictionary.home.signedOutTitle}</h2>
            <p>{dictionary.home.signedOutDescription}</p>
            <div className="actions">
              <Link className="button" href="/login">
                {dictionary.navigation.signIn}
              </Link>
              <Link className="button button-secondary" href="/register">
                {dictionary.home.createAccount}
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
