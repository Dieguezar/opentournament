import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DisputeMessageForm } from '@/components/dispute-message-form';
import { DisputeResolveForm } from '@/components/dispute-resolve-form';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface MessageView {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

interface RulingView {
  id: string;
  rationale: string;
  decision: { winnerId?: string };
}

export default async function DisputePage({
  params,
}: {
  params: Promise<{ disputeId: string }>;
}) {
  const { disputeId } = await params;
  const res = await serverFetch<{
    dispute: {
      id: string;
      status: string;
      reason: string;
      matchId: string;
    };
    messages: MessageView[];
    ruling: RulingView | null;
    match: {
      homeTeamId: string | null;
      awayTeamId: string | null;
      homeTeamName: string | null;
      awayTeamName: string | null;
    } | null;
  }>(`/disputes/${disputeId}`);
  if (res.status === 401) redirect('/login');
  if (res.status === 403) notFound();
  const dispute = res.data?.dispute;
  if (!dispute) notFound();
  const messages = res.data?.messages ?? [];
  const ruling = res.data?.ruling ?? null;

  return (
    <main className="container">
      <p>
        <Link href="/dashboard">← Panel</Link>
      </p>
      <h1>Disputa {dispute.id.slice(0, 8)}</h1>
      <p className="muted">
        Estado: {dispute.status} · Razón: {dispute.reason}
      </p>

      <div className="card">
        <h2>Conversación</h2>
        {messages.length === 0 ? (
          <p className="muted">Sin mensajes todavía.</p>
        ) : (
          <ul>
            {messages.map((message) => (
              <li key={message.id}>
                <strong>{message.authorName}:</strong> {message.body}
              </li>
            ))}
          </ul>
        )}
        {dispute.status !== 'resolved' && <DisputeMessageForm disputeId={dispute.id} />}
      </div>

      {dispute.status !== 'resolved' && (
        <div className="card">
          <DisputeResolveForm
            disputeId={dispute.id}
            homeTeamId={res.data?.match?.homeTeamId ?? null}
            awayTeamId={res.data?.match?.awayTeamId ?? null}
            homeName={res.data?.match?.homeTeamName ?? null}
            awayName={res.data?.match?.awayTeamName ?? null}
          />
        </div>
      )}

      {ruling && (
        <div className="card">
          <h2>Resolución</h2>
          <p>{ruling.rationale}</p>
        </div>
      )}
    </main>
  );
}
