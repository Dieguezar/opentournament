import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('Next.js security headers', () => {
  it('applies the public security baseline to every route', async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.headers).toBeTypeOf('function');

    const definitions = await nextConfig.headers?.();
    const globalDefinition = definitions?.find((definition) => definition.source === '/(.*)');
    const headers = Object.fromEntries(
      globalDefinition?.headers.map(({ key, value }) => [key, value]) ?? [],
    );

    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['Cross-Origin-Embedder-Policy']).toBe('credentialless');
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headers['Content-Security-Policy']).toContain("object-src 'none'");
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });
});
