import { TrophyIcon } from '@phosphor-icons/react/dist/ssr/Trophy';
import Link from 'next/link';
import { Suspense } from 'react';
import { ActiveNavLink } from '@/components/active-nav-link';
import { LogoutButton } from '@/components/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { getAuthSession } from '@/lib/auth-session';
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

export async function Header() {
  const { status, data } = await getAuthSession();
  const user = status === 200 ? data.user : null;
  const presentation = user
    ? getHeaderPresentation({ user, participantAccess: data.participantAccess ?? null })
    : null;
  const isApiUnavailable = status === 503;

  return (
    <header className="nav">
      <div className="nav-inner">
        <div className="nav-leading">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              <TrophyIcon size={17} weight="bold" />
            </span>
            OpenTournament
          </Link>
          {presentation && <span className="workspace-chip">{presentation.workspaceLabel}</span>}
        </div>
        <nav className="nav-links" aria-label="Principal">
          {presentation ? (
            presentation.links.map((link) => (
              <HeaderNavLink href={link.href} key={link.href}>
                {link.label}
              </HeaderNavLink>
            ))
          ) : (
            <>
              <HeaderNavLink href="/login">Iniciar sesión</HeaderNavLink>
              <HeaderNavLink href="/register">Registrarse</HeaderNavLink>
            </>
          )}
        </nav>
        <div className="nav-actions">
          {isApiUnavailable && (
            <span className="badge badge-danger" role="status">
              API sin conexión
            </span>
          )}
          <ThemeToggle />
          {presentation && (
            <>
              <span className="nav-account">
                <span className="nav-avatar" aria-hidden="true">
                  {presentation.accountLabel.slice(0, 1).toUpperCase()}
                </span>
                <span className="nav-user">{presentation.accountLabel}</span>
              </span>
              <LogoutButton />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
