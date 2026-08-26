import { getApiErrorMessage } from './api-error-messages';
import { DEFAULT_LOCALE, resolveLocale } from './i18n';

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly serverMessage: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface ApiErrorPayload {
  error?: { code?: string; message?: string };
}

function getClientLocale() {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  return resolveLocale(document.documentElement.lang);
}

/** Llamada desde el cliente: usa la URL relativa (rewrite de Next) y gestiona CSRF. */
export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const method = (init?.method ?? 'GET').toUpperCase();

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfRes = await fetch('/api/v1/auth/csrf');
    const csrf = (await csrfRes.json()) as { token?: string };
    if (csrf.token) {
      headers.set('X-CSRF-Token', csrf.token);
    }
  }

  const res = await fetch(`/api/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload;
    const code = payload.error?.code ?? 'UNKNOWN';
    const serverMessage = payload.error?.message ?? `Request failed with status ${res.status}`;
    throw new ApiClientError(
      res.status,
      code,
      getApiErrorMessage(code, getClientLocale(), serverMessage),
      serverMessage,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
