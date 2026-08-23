'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type ConnectionState = 'connecting' | 'live' | 'reconnecting';

const connectionLabels: Record<ConnectionState, string> = {
  connecting: 'Conectando actualizaciones',
  live: 'Actualización en vivo',
  reconnecting: 'Reconectando actualizaciones',
};

export function LiveTournament({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const refreshing = useRef(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');

  useEffect(() => {
    const source = new EventSource(
      `/api/v1/events/public?tournament=${encodeURIComponent(tournamentId)}`,
    );
    source.onopen = () => setConnectionState('live');
    source.onerror = () => setConnectionState('reconnecting');
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
      {connectionLabels[connectionState]}
    </span>
  );
}
