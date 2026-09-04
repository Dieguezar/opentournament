import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ApiClientError } from '../lib/api';
import { getDictionary } from '../lib/i18n';
import {
  createTournamentMediaController,
  createTournamentMediaMutationQueue,
  deleteTournamentMedia,
  TournamentMediaForm,
  uploadTournamentMedia,
  type TournamentMediaClient,
} from './tournament-media-controls';

function clientFor(responses: unknown[]): {
  client: TournamentMediaClient;
  calls: string[];
  inits: RequestInit[];
} {
  const calls: string[] = [];
  const inits: RequestInit[] = [];
  return {
    calls,
    inits,
    client: async function <T>(path: string, init?: RequestInit) {
      if (init) inits.push(init);
      calls.push(`${init?.method ?? 'GET'} ${path}${init?.body ? ` ${init.body}` : ''}`);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response as T;
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe('tournament media controls workflow', () => {
  it('uploads each slot with FormData and reloads authoritative media IDs', async () => {
    const file = new File(['image'], 'logo.png', { type: 'image/png' });
    const { client, calls, inits } = clientFor([
      undefined,
      { appearance: { logoMediaId: '11111111-1111-4111-8111-111111111111', bannerMediaId: null } },
    ]);

    await expect(uploadTournamentMedia(client, 't1', 'logo', file)).resolves.toEqual({
      logoMediaId: '11111111-1111-4111-8111-111111111111',
      bannerMediaId: null,
    });
    expect(inits[0]?.body).toBeInstanceOf(FormData);
    expect((inits[0]?.body as FormData).get('file')).toBe(file);
    expect(calls).toEqual([
      'POST /tournaments/t1/appearance/logo [object FormData]',
      'GET /tournaments/t1',
    ]);
  });

  it('uploads the banner through its own endpoint and reloads both slots', async () => {
    const file = new File(['image'], 'banner.png', { type: 'image/png' });
    const { client, calls } = clientFor([
      undefined,
      {
        appearance: {
          logoMediaId: '11111111-1111-4111-8111-111111111111',
          bannerMediaId: '22222222-2222-4222-8222-222222222222',
        },
      },
    ]);
    await expect(uploadTournamentMedia(client, 't1', 'banner', file)).resolves.toEqual({
      logoMediaId: '11111111-1111-4111-8111-111111111111',
      bannerMediaId: '22222222-2222-4222-8222-222222222222',
    });
    expect(calls).toEqual([
      'POST /tournaments/t1/appearance/banner [object FormData]',
      'GET /tournaments/t1',
    ]);
  });
  it('propagates an API failure without a false success state', async () => {
    const failed = clientFor([new ApiClientError(403, 'FORBIDDEN', 'Denied', 'Denied')]);
    await expect(deleteTournamentMedia(failed.client, 't1', 'logo')).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('rendered tournament media controls', () => {
  it('uses bilingual accessible labels and only same-origin opaque previews', () => {
    const english = renderToStaticMarkup(
      <TournamentMediaForm
        busy={false}
        copy={getDictionary('en').tournamentAdmin}
        error={null}
        media={{
          logoMediaId: '11111111-1111-4111-8111-111111111111',
          bannerMediaId: 'https://storage.example/banner',
        }}
        success={null}
        onDelete={() => undefined}
        onUpload={() => undefined}
      />,
    );
    expect(english).toContain('Tournament logo');
    expect(english).toContain('src="/api/v1/media/11111111-1111-4111-8111-111111111111"');
    expect(english).not.toContain('storage.example');

    const spanish = renderToStaticMarkup(
      <TournamentMediaForm
        busy={false}
        copy={getDictionary('es').tournamentAdmin}
        error={null}
        media={{ logoMediaId: null, bannerMediaId: null }}
        success={null}
        onDelete={() => undefined}
        onUpload={() => undefined}
      />,
    );
    expect(spanish).toContain('Logo del torneo');
  });

  it('announces busy and error states while disabling all serialized controls', () => {
    const copy = getDictionary('en').tournamentAdmin;
    const busy = renderToStaticMarkup(
      <TournamentMediaForm
        busy={true}
        copy={copy}
        error={null}
        media={{ logoMediaId: null, bannerMediaId: '22222222-2222-4222-8222-222222222222' }}
        success={null}
        onDelete={() => undefined}
        onUpload={() => undefined}
      />,
    );
    expect(busy).toContain('role="status"');
    expect(busy).toContain(copy.uploadingLogo);
    for (const [tag, id] of [
      ['input', 'logo-file'],
      ['input', 'banner-file'],
      ['button', 'logo-remove'],
      ['button', 'banner-remove'],
    ]) {
      const element = (busy.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) ?? []).find((candidate) =>
        new RegExp(`\\bid="${id}"`).test(candidate),
      );
      expect(element).toMatch(/\sdisabled(?:=""|(?=\s|>))/);
      expect(element).not.toMatch(/\s(?:aria-disabled|data-disabled)=/);
    }

    const error = renderToStaticMarkup(
      <TournamentMediaForm
        busy={false}
        copy={copy}
        error="Denied"
        media={{ logoMediaId: null, bannerMediaId: '22222222-2222-4222-8222-222222222222' }}
        success={null}
        onDelete={() => undefined}
        onUpload={() => undefined}
      />,
    );
    expect(error).toContain('role="alert"');
    expect(error).not.toContain(copy.mediaSaved);
  });
});

it('queues logo and banner workflows through ordered authoritative reloads', async () => {
  const { client, calls } = clientFor([
    undefined,
    { appearance: { logoMediaId: 'logo', bannerMediaId: null } },
    undefined,
    { appearance: { logoMediaId: 'logo', bannerMediaId: 'banner' } },
  ]);
  const queue = createTournamentMediaMutationQueue();
  const logo = queue.run(() =>
    uploadTournamentMedia(client, 't1', 'logo', new File(['x'], 'logo.png')),
  );
  const banner = queue.run(() =>
    uploadTournamentMedia(client, 't1', 'banner', new File(['x'], 'banner.png')),
  );

  await expect(logo).resolves.toEqual({ logoMediaId: 'logo', bannerMediaId: null });
  await expect(banner).resolves.toEqual({ logoMediaId: 'logo', bannerMediaId: 'banner' });
  expect(calls).toEqual([
    'POST /tournaments/t1/appearance/logo [object FormData]',
    'GET /tournaments/t1',
    'POST /tournaments/t1/appearance/banner [object FormData]',
    'GET /tournaments/t1',
  ]);
});

it('keeps the production controller queue alive after a failed mutation', async () => {
  const secondMutation = deferred<undefined>();
  const calls: string[] = [];
  const client: TournamentMediaClient = async (path, init) => {
    calls.push(`${init?.method ?? 'GET'} ${path}`);
    if (calls.length === 1) {
      throw new ApiClientError(503, 'UNAVAILABLE', 'Unavailable', 'Unavailable');
    }
    if (calls.length === 2) return secondMutation.promise as never;
    return { appearance: { logoMediaId: null, bannerMediaId: 'banner' } } as never;
  };
  const controller = createTournamentMediaController(
    client,
    't1',
    { logoMediaId: null, bannerMediaId: null },
    () => getDictionary('en').tournamentAdmin,
  );
  const first = controller.upload('logo', new File(['x'], 'logo.png'));
  const second = controller.upload('banner', new File(['x'], 'banner.png'));

  await expect(first).resolves.toBeUndefined();
  expect(controller.state).toMatchObject({ busy: true, error: null });
  secondMutation.resolve(undefined);
  await expect(second).resolves.toBeUndefined();
  expect(calls).toEqual([
    'POST /tournaments/t1/appearance/logo',
    'POST /tournaments/t1/appearance/banner',
    'GET /tournaments/t1',
  ]);
  expect(controller.state).toMatchObject({
    busy: false,
    error: null,
    media: { logoMediaId: null, bannerMediaId: 'banner' },
  });
});

it('exposes the production controller lifecycle through queued authoritative mutations', async () => {
  const firstMutation = deferred<undefined>();
  const firstReload = deferred<{ appearance: { logoMediaId: string; bannerMediaId: null } }>();
  const secondMutation = deferred<undefined>();
  const secondReload = deferred<{ appearance: { logoMediaId: string; bannerMediaId: string } }>();
  const calls: string[] = [];
  const client: TournamentMediaClient = async (path, init) => {
    calls.push(`${init?.method ?? 'GET'} ${path}`);
    if (calls.length === 1) return firstMutation.promise as never;
    if (calls.length === 2) return firstReload.promise as never;
    if (calls.length === 3) return secondMutation.promise as never;
    return secondReload.promise as never;
  };
  const controller = createTournamentMediaController(
    client,
    't1',
    { logoMediaId: null, bannerMediaId: null },
    () => getDictionary('en').tournamentAdmin,
  );
  const logo = controller.upload('logo', new File(['x'], 'logo.png'));
  const banner = controller.upload('banner', new File(['x'], 'banner.png'));
  expect(controller.state.busy).toBe(true);

  firstMutation.resolve(undefined);
  await Promise.resolve();
  firstReload.resolve({ appearance: { logoMediaId: 'logo', bannerMediaId: null } });
  await logo;
  expect(controller.state).toMatchObject({ busy: true, media: { logoMediaId: 'logo' } });

  secondMutation.resolve(undefined);
  await Promise.resolve();
  secondReload.resolve({ appearance: { logoMediaId: 'logo', bannerMediaId: 'banner' } });
  await banner;
  expect(calls).toEqual([
    'POST /tournaments/t1/appearance/logo',
    'GET /tournaments/t1',
    'POST /tournaments/t1/appearance/banner',
    'GET /tournaments/t1',
  ]);
  expect(controller.state).toMatchObject({
    busy: false,
    media: { logoMediaId: 'logo', bannerMediaId: 'banner' },
  });
});
