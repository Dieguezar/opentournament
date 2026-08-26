import { cache } from 'react';
import { serverFetch } from './server-api';

export interface AuthSessionResponse {
  user: { displayName: string } | null;
  participantAccess: {
    tournamentSlug: string;
    teamName: string;
  } | null;
}

export const getAuthSession = cache(() => serverFetch<AuthSessionResponse>('/auth/me'));
