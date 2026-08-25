'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';
import { shouldShowRegistrationDecisionActions } from '@/lib/presentation';

export interface RegistrationView {
  id: string;
  teamId: string;
  status: string;
  teamName: string;
  teamTag: string | null;
  captainName: string | null;
  waitlistPosition: number | null;
}

export function RegistrationActions({
  tournamentId,
  registration,
}: {
  tournamentId: string;
  registration: RegistrationView;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function decide(status: 'approved' | 'rejected') {
    setError(null);
    try {
      await apiClient(`/tournaments/${tournamentId}/registrations/${registration.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'error');
    }
  }

  if (!shouldShowRegistrationDecisionActions(registration.status)) return null;

  return (
    <>
      <button type="button" onClick={() => decide('approved')}>
        Aprobar
      </button>{' '}
      <button type="button" className="button button-secondary" onClick={() => decide('rejected')}>
        Rechazar
      </button>
      {error && (
        <span className="error" role="alert">
          {' '}
          {error}
        </span>
      )}
    </>
  );
}
