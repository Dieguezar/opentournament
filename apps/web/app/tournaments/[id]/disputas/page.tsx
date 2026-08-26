import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { serverFetch } from '@/lib/server-api';
import { formatDisputeReason, formatDisputeStatus } from '@/lib/presentation';
import { formatMessage, getDictionary } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n-server';

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

export default async function DisputesPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getRequestLocale();
  const copy = getDictionary(locale).disputes;
  const { id } = await params;
  const res = await serverFetch<{ disputes: DisputeView[] }>(`/tournaments/${id}/disputes`);
  if (res.status === 401) redirect('/login');
  if (res.status === 403) notFound();
  const disputes = res.data?.disputes ?? [];

  return (
    <main className="container">
      <p>
        <Link href={`/tournaments/${id}`}>← {copy.backTournament}</Link>
      </p>
      <header className="page-heading compact-hero">
        <div>
          <p className="eyebrow">{copy.arbitration}</p>
          <h1>{copy.title}</h1>
          <p className="muted">{copy.intro}</p>
        </div>
        <span className="badge">{formatMessage(copy.caseCount, { count: disputes.length })}</span>
      </header>
      {disputes.length === 0 ? (
        <p className="muted">{copy.noDisputes}</p>
      ) : (
        <ul className="dispute-list">
          {disputes.map((dispute) => (
            <li className="dispute-item" key={dispute.id}>
              <div>
                <Link href={`/disputas/${dispute.id}`}>
                  <strong>
                    {dispute.homeTeam ?? 'TBD'} vs {dispute.awayTeam ?? 'TBD'}
                  </strong>
                </Link>
                <small>{formatDisputeReason(dispute.reason, locale)}</small>
              </div>
              <div className="dispute-meta">
                <span
                  className={`badge ${dispute.status === 'resolved' ? 'badge-success' : 'badge-warn'}`}
                >
                  {formatDisputeStatus(dispute.status, locale)}
                </span>
                {dispute.assigneeName && (
                  <small>{formatMessage(copy.referee, { name: dispute.assigneeName })}</small>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
