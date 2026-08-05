import { describe, expect, it } from 'vitest';

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)('integración de la API (requiere PostgreSQL)', () => {
  it('registro → me → crear organización → logout', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const { runMigrations } = await import('@opentournament/database');
    const { initServer } = await import('./app.js');
    const { pool } = await import('./db.js');

    await runMigrations(process.env.TEST_DATABASE_URL!);
    const app = await initServer(false);

    try {
      const csrfRes = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf' });
      const csrfCookie = csrfRes.cookies.find((c) => c.name === 'csrf')!;
      const csrfBody = csrfRes.json<{ token: string }>();

      const email = `test-${Date.now()}@example.com`;
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { displayName: 'Test User', email, password: 'password-123' },
        headers: { 'x-csrf-token': csrfBody.token, cookie: `${csrfCookie.name}=${csrfCookie.value}` },
      });
      expect(registerRes.statusCode).toBe(201);
      const sessionCookie = registerRes.cookies.find((c) => c.name === 'session')!;
      const cookieHeader = `session=${sessionCookie.value}; csrf=${csrfCookie.value}`;

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: cookieHeader },
      });
      expect(meRes.statusCode).toBe(200);
      expect(meRes.json<{ user: { email: string } }>().user.email).toBe(email);

      const orgRes = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        payload: { name: 'Equipo Test', slug: `test-${Date.now()}` },
        headers: { 'x-csrf-token': csrfBody.token, cookie: cookieHeader },
      });
      expect(orgRes.statusCode).toBe(201);

      const orgsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations',
        headers: { cookie: cookieHeader },
      });
      expect(orgsRes.json<{ organizations: unknown[] }>().organizations.length).toBe(1);

      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { 'x-csrf-token': csrfBody.token, cookie: cookieHeader },
      });
      expect(logoutRes.statusCode).toBe(204);

      const meAfter = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: cookieHeader },
      });
      expect(meAfter.statusCode).toBe(401);
    } finally {
      await app.close();
      await pool.end();
    }
  });
});
