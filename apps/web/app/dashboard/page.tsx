import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { SessionUser } from '@opentournament/shared-types';
import { LogoutButton } from '@/components/logout-button';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { status, data } = await serverFetch<{ user: SessionUser }>('/auth/me');
  if (status === 401) redirect('/login');
  const user = (data as { user?: SessionUser }).user;
  if (!user) redirect('/login');

  return (
    <main className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Panel de OpenTournament</h1>
        <LogoutButton />
      </header>
      <div className="card">
        <p>
          Hola, <strong>{user.displayName}</strong>.
        </p>
        {user.organizations.length === 0 ? (
          <>
            <p className="muted">Todavía no perteneces a ninguna organización.</p>
            <Link className="button" href="/wizard">
              Crear mi organización
            </Link>
          </>
        ) : (
          <>
            <h2>Mis organizaciones</h2>
            <ul>
              {user.organizations.map((org) => (
                <li key={org.id}>
                  <Link href={`/organizations/${org.slug}`}>{org.name}</Link>{' '}
                  <span className="muted">({org.role})</span>
                </li>
              ))}
            </ul>
            <Link className="button button-secondary" href="/wizard">
              Crear otra organización
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
