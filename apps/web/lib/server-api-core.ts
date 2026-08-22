export interface ApiResource<T> {
  status: number;
  data: T;
}

export async function fetchApiResource<T>(
  apiBase: string,
  path: string,
  cookie: string,
  fetcher: typeof fetch = fetch,
): Promise<ApiResource<T>> {
  try {
    const response = await fetcher(`${apiBase}/api/v1${path}`, {
      headers: { cookie },
      cache: 'no-store',
    });
    const data = (await response.json().catch(() => null)) as T | null;
    return { status: response.status, data: (data ?? {}) as T };
  } catch {
    return { status: 503, data: {} as T };
  }
}
