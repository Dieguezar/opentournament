import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface DisputeView {
  id: string;
  status: string;
  reason: string;
  openedAt: string;
  assigneeName: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
}

export default async function DisputesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await serverFetch<{ disputes: DisputeView[] }>(`/tournaments/${id}/disputes`);
  if (res.status === 401) redirect('/login');
  if (res.status === 403) notFound();
  const disputes = res.data?.disputes ?? [];

  return (
    <main className="container">
      <p>
        <Link href={`/tournaments/${id}`}>← Torneo</Link>
      </p>
      <h1>Disputas</h1>
      {disputes.length === 0 ? (
        <p className="muted">No hay disputas.</p>
      ) : (
        <ul>
          {disputes.map((dispute) => (
            <li key={dispute.id}>
              <Link href={`/disputas/${dispute.id}`}>
                {dispute.homeTeam ?? 'TBD'} vs {dispute.awayTeam ?? 'TBD'}
              </Link>{' '}
              <span className="muted">
                ({dispute.status} · {dispute.reason}
                {dispute.assigneeName ? ` · árbitro: ${dispute.assigneeName}` : ''})
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
