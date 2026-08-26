import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DisputeMessageForm } from '@/components/dispute-message-form';
import { DisputeResolveForm } from '@/components/dispute-resolve-form';
import { serverFetch } from '@/lib/server-api';
import { formatDisputeReason, formatDisputeStatus } from '@/lib/presentation';
import { formatMessage, getDictionary } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n-server';

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

export default async function DisputePage({ params }: { params: Promise<{ disputeId: string }> }) {
  const locale = await getRequestLocale();
  const copy = getDictionary(locale).disputes;
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
        <Link href="/dashboard">← {copy.backDashboard}</Link>
      </p>
      <header className="page-heading compact-hero">
        <div>
          <p className="eyebrow">{formatMessage(copy.case, { id: dispute.id.slice(0, 8) })}</p>
          <h1>
            {res.data?.match?.homeTeamName ?? 'TBD'} vs {res.data?.match?.awayTeamName ?? 'TBD'}
          </h1>
          <p className="muted">{formatDisputeReason(dispute.reason, locale)}</p>
        </div>
        <span className={`badge ${dispute.status === 'resolved' ? 'badge-success' : 'badge-warn'}`}>
          {formatDisputeStatus(dispute.status, locale)}
        </span>
      </header>

      <div className="card">
        <h2>{copy.conversation}</h2>
        {messages.length === 0 ? (
          <p className="muted">{copy.noMessages}</p>
        ) : (
          <ul className="message-list">
            {messages.map((message) => (
              <li className="message-item" key={message.id}>
                <strong>{message.authorName}</strong>
                <p>{message.body}</p>
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
        <div className="card ruling-card">
          <p className="eyebrow">{copy.finalDecision}</p>
          <h2>{copy.resolution}</h2>
          <p>{ruling.rationale}</p>
        </div>
      )}
    </main>
  );
}
