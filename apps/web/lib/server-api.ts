import { cookies } from 'next/headers';
import { fetchApiResource } from './server-api-core';

const API_BASE = process.env.API_URL ?? 'http://localhost:4000';

/** Llamada desde el servidor (server components): reenvía las cookies del navegador. */
export async function serverFetch<T>(path: string): Promise<{ status: number; data: T }> {
  const cookieStore = await cookies();
  return fetchApiResource<T>(API_BASE, path, cookieStore.toString());
}
