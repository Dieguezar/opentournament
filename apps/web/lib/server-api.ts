import { cookies } from 'next/headers';

const API_BASE = process.env.API_URL ?? 'http://localhost:4000';

/** Llamada desde el servidor (server components): reenvía las cookies del navegador. */
export async function serverFetch<T>(path: string): Promise<{ status: number; data: T }> {
  const cookieStore = await cookies();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => null)) as T | null;
  return { status: res.status, data: (data ?? {}) as T };
}
