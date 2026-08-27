import Link from 'next/link';
import { Suspense } from 'react';
import { ActiveNavLink } from '@/components/active-nav-link';
import { BrandLogo } from '@/components/brand-logo';
import { LanguageSelector } from '@/components/language-selector';
import { LogoutButton } from '@/components/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { getAuthSession } from '@/lib/auth-session';
import { getDictionary, type Locale } from '@/lib/i18n';
import { getHeaderPresentation } from '@/lib/participant-experience';

interface HeaderNavLinkProps {
  children: string;
  href: string;
}

function HeaderNavLink({ children, href }: HeaderNavLinkProps) {
  return (
    <Suspense
      fallback={
        <Link className="nav-link" href={href}>
          {children}
        </Link>
      }
    >
      <ActiveNavLink href={href}>{children}</ActiveNavLink>
    </Suspense>
  );
}

export async function Header({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  const { status, data } = await getAuthSession();
  const user = status === 200 ? data.user : null;
  const presentation = user
    ? getHeaderPresentation({ user, participantAccess: data.participantAccess ?? null }, locale)
    : null;
  const isApiUnavailable = status === 503;

  return (
    <header className="nav">
      <div className="nav-inner">
        <div className="nav-leading">
          <Link className="brand" href="/">
            <BrandLogo />
            <span className="brand-wordmark">OpenTournament</span>
          </Link>
          {presentation && <span className="workspace-chip">{presentation.workspaceLabel}</span>}
        </div>
        {presentation && (
          <nav className="nav-links" aria-label={dictionary.navigation.primary}>
            {presentation.links.map((link) => (
              <HeaderNavLink href={link.href} key={link.href}>
                {link.label}
              </HeaderNavLink>
            ))}
          </nav>
        )}
        <div className="nav-actions">
          {isApiUnavailable && (
            <span className="badge badge-danger" role="status">
              {dictionary.navigation.apiUnavailable}
            </span>
          )}
          <LanguageSelector />
          <ThemeToggle />
          {presentation ? (
            <>
              <span className="nav-account">
                <span className="nav-avatar" aria-hidden="true">
                  {presentation.accountLabel.slice(0, 1).toUpperCase()}
                </span>
                <span className="nav-user">{presentation.accountLabel}</span>
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link className="button button-secondary button-small" href="/login">
                {dictionary.navigation.signIn}
              </Link>
              <Link className="button button-small" href="/register">
                {dictionary.navigation.register}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
