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
    source.addEventListener('message', () => {
      if (refreshing.current) return;
      refreshing.current = true;
      router.refresh();
      setTimeout(() => {
        refreshing.current = false;
      }, 1500);
    });
    return () => source.close();
  }, [router, tournamentId]);

  return (
    <span className="muted" role="status" aria-live="polite">
      ● En vivo
    </span>
  );
}
