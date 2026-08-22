import Link from 'next/link';
import { LogoutButton } from '@/components/logout-button';
import { serverFetch } from '@/lib/server-api';

export async function Header() {
  const { status, data } = await serverFetch<{ user: { displayName: string } | null }>('/auth/me');
  const user = status === 200 ? data.user : null;
  const isApiUnavailable = status === 503;

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link className="brand" href="/">
          OpenTournament
        </Link>
        <nav aria-label="Principal">
          {user ? (
            <>
              <Link href="/dashboard">Panel</Link>
              <Link href="/tournaments/new">Crear torneo</Link>
              <Link href="/teams/new">Crear equipo</Link>
              <span className="nav-user">{user.displayName}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login">Iniciar sesión</Link>
              <Link href="/register">Registrarse</Link>
              {isApiUnavailable && (
                <span className="badge badge-danger" role="status">
                  API sin conexión
                </span>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
