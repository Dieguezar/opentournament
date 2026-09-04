import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ApiClientError } from '../lib/api';
import { getDictionary } from '../lib/i18n';
import {
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
    expect(busy.match(/disabled=""/g)).toHaveLength(4);
    expect(busy).not.toMatch(/id="banner-file"[^>]*disabled/);

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

it('serializes overlapping slot mutations until the first authoritative projection resolves', async () => {
  let resolveFirst!: (value: { logoMediaId: string | null; bannerMediaId: string | null }) => void;
  const first = new Promise<{ logoMediaId: string | null; bannerMediaId: string | null }>(
    (resolve) => {
      resolveFirst = resolve;
    },
  );
  const queue = createTournamentMediaMutationQueue();
  const firstRun = queue.run(() => first);
  await expect(
    queue.run(() => Promise.resolve({ logoMediaId: null, bannerMediaId: 'late' })),
  ).resolves.toBeNull();
  resolveFirst({ logoMediaId: 'new-logo', bannerMediaId: null });
  await expect(firstRun).resolves.toEqual({ logoMediaId: 'new-logo', bannerMediaId: null });
});
