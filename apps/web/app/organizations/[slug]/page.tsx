import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Organization } from '@opentournament/shared-types';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface MemberRow {
  id: string;
  userId: string;
  role: string;
  email: string | null;
  displayName: string;
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { status, data } = await serverFetch<{
    organization: Organization;
    role: string;
    members: MemberRow[];
  }>(`/organizations/by-slug/${slug}`);

  if (status === 401) redirect('/login');
  if (status === 404) notFound();
  const organization = (data as { organization?: Organization }).organization;
  if (!organization) notFound();

  return (
    <main className="container">
      <p>
        <Link href="/dashboard">← Panel</Link>
      </p>
      <h1>{organization.name}</h1>
      <p className="muted">/{organization.slug}</p>
      {organization.description && <p>{organization.description}</p>}
      <div className="card">
        <h2>Miembros</h2>
        <ul>
          {data.members.map((member) => (
            <li key={member.id}>
              {member.displayName} <span className="muted">({member.role})</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="muted">
        La creación de torneos y equipos llega con la Fase 2.
      </p>
    </main>
  );
}
