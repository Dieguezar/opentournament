'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function LiveTournament({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const refreshing = useRef(false);

  useEffect(() => {
    const source = new EventSource(
      `/api/v1/events/public?tournament=${encodeURIComponent(tournamentId)}`,
    );
    let refreshTimeout: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (refreshing.current) return;
      refreshing.current = true;
      router.refresh();
      refreshTimeout = setTimeout(() => {
        refreshing.current = false;
      }, 1500);
    };
    const eventNames = [
      'tournament.updated',
      'bracket.updated',
      'match.updated',
      'result.confirmed',
      'dispute.opened',
      'dispute.resolved',
      'checkin.updated',
    ];
    for (const eventName of eventNames) source.addEventListener(eventName, refresh);

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      for (const eventName of eventNames) source.removeEventListener(eventName, refresh);
      source.close();
    };
  }, [router, tournamentId]);

  return (
    <span className="muted" role="status" aria-live="polite">
      ● En vivo
    </span>
  );
}
