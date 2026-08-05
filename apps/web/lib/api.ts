export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface ApiErrorPayload {
  error?: { code?: string; message?: string };
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
    throw new ApiClientError(
      res.status,
      payload.error?.code ?? 'UNKNOWN',
      payload.error?.message ?? `Error ${res.status}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
