import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ApiClientError } from '../lib/api';
import { getDictionary } from '../lib/i18n';
import { I18nProvider } from './i18n-provider';
import {
  loadAppearance,
  saveAppearance,
  TournamentAppearanceForm,
  TournamentAppearanceControls,
  validatePalette,
  type AppearanceClient,
} from './tournament-appearance-controls';

function clientFor(responses: unknown[]): { client: AppearanceClient; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    client: async function <T>(path: string, init?: RequestInit) {
      calls.push(`${init?.method ?? 'GET'} ${path}${init?.body ? ` ${init.body}` : ''}`);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response as T;
    },
  };
}

describe('tournament appearance controls workflow', () => {
  it('projects authoritative initial colors and reloads the saved response', async () => {
    const { client, calls } = clientFor([
      { appearance: { primaryColor: '#123456', accentColor: '#abcdef' } },
    ]);
    await expect(loadAppearance(client, 't1')).resolves.toEqual({
      primaryColor: '#123456',
      accentColor: '#ABCDEF',
    });
    expect(calls).toEqual(['GET /tournaments/t1']);

    const saved = clientFor([{ appearance: { primaryColor: '#654321', accentColor: '#FEDCBA' } }]);
    await expect(
      saveAppearance(saved.client, 't1', { primaryColor: '#654321', accentColor: '#fedcba' }),
    ).resolves.toEqual({ primaryColor: '#654321', accentColor: '#FEDCBA' });
    expect(saved.calls).toEqual([expect.stringContaining('PATCH /tournaments/t1/appearance')]);
  });

  it('rejects invalid values locally and propagates authorization failure without success', async () => {
    expect(validatePalette({ primaryColor: '#FFF', accentColor: 'red' })).toBeNull();
    const denied = clientFor([new ApiClientError(403, 'FORBIDDEN', 'Denied', 'Denied')]);
    await expect(
      saveAppearance(denied.client, 't1', { primaryColor: '#123456', accentColor: '#ABCDEF' }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('preserves null defaults, including resetting only one color', async () => {
    expect(validatePalette({ primaryColor: null, accentColor: null })).toEqual({
      primaryColor: null,
      accentColor: null,
    });
    expect(validatePalette({ primaryColor: null, accentColor: '#abcdef' })).toEqual({
      primaryColor: null,
      accentColor: '#ABCDEF',
    });
    const { client } = clientFor([{ appearance: null }]);
    await expect(loadAppearance(client, 't1')).resolves.toEqual({
      primaryColor: null,
      accentColor: null,
    });
  });
});

describe('rendered palette controls', () => {
  it('renders bilingual accessible labels and scoped preview variables', () => {
    const markup = renderToStaticMarkup(
      <I18nProvider dictionary={getDictionary('en')} locale="en">
        <TournamentAppearanceControls
          tournamentId="t1"
          initialAppearance={{ primaryColor: '#123456', accentColor: '#abcdef' }}
        />
      </I18nProvider>,
    );
    expect(markup).toContain('Primary color');
    expect(markup).toContain('Accent color');
    expect(markup).toContain('aria-label="Palette preview"');
    expect(markup).toContain('--tournament-primary:#123456');
    expect(markup).toContain('--tournament-accent:#ABCDEF');
    expect(markup.match(/type="color"/g)).toHaveLength(2);
    expect(markup).toContain('Suggested palettes');

    const spanish = renderToStaticMarkup(
      <I18nProvider dictionary={getDictionary('es')} locale="es">
        <TournamentAppearanceControls tournamentId="t1" initialAppearance={null} />
      </I18nProvider>,
    );
    expect(spanish).toContain('Color principal');
    expect(spanish).toContain('Vista previa de la paleta');
  });

  function renderForm({
    busy = false,
    error = null,
    success = null,
  }: {
    busy?: boolean;
    error?: string | null;
    success?: string | null;
  }) {
    return renderToStaticMarkup(
      <TournamentAppearanceForm
        busy={busy}
        copy={getDictionary('en').tournamentAdmin}
        error={error}
        palette={{ primaryColor: '#123456', accentColor: '#ABCDEF' }}
        success={success}
        onPaletteChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );
  }

  it('renders invalid hex feedback without a success announcement', () => {
    const copy = getDictionary('en').tournamentAdmin;
    const markup = renderForm({ error: copy.invalidAppearance });

    expect(markup).toContain('role="alert"');
    expect(markup).toContain(copy.invalidAppearance);
    expect(markup).not.toContain('role="status"');
  });

  it('renders an announced saving state with every editable control disabled', () => {
    const copy = getDictionary('en').tournamentAdmin;
    const markup = renderForm({ busy: true });

    expect(markup).toContain('role="status"');
    expect(markup).toContain(copy.savingAppearance);
    expect(markup.match(/disabled=""/g)).toHaveLength(7);
    expect(markup).toContain('aria-busy="true"');
  });

  it('previews the real tournament name and media while identifying unsaved colors', () => {
    const markup = renderToStaticMarkup(
      <TournamentAppearanceForm
        busy={false}
        copy={getDictionary('en').tournamentAdmin}
        error={null}
        success={null}
        palette={{ primaryColor: '#8B5CF6', accentColor: '#F472B6' }}
        dirty
        tournamentName="Preview Cup"
        media={{ logoMediaId: '11111111-1111-4111-8111-111111111111', bannerMediaId: null }}
        onPaletteChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );
    expect(markup).toContain('<h3>Preview Cup</h3>');
    expect(markup).toContain('Unsaved colors');
    expect(markup).toContain('/api/v1/media/11111111-1111-4111-8111-111111111111');
    expect(markup).not.toContain('Saved colors');
  });

  it('renders API failure without a false success and success only after convergence', async () => {
    const copy = getDictionary('en').tournamentAdmin;
    const failure = renderForm({ error: 'Denied' });
    expect(failure).toContain('role="alert"');
    expect(failure).not.toContain(copy.appearanceSaved);

    const saved = await saveAppearance(
      clientFor([{ appearance: { primaryColor: '#654321', accentColor: '#FEDCBA' } }]).client,
      't1',
      { primaryColor: '#123456', accentColor: '#ABCDEF' },
    );
    const success = renderForm({ success: copy.appearanceSaved });
    expect(saved).toEqual({ primaryColor: '#654321', accentColor: '#FEDCBA' });
    expect(success).toContain('role="status"');
    expect(success).toContain(copy.appearanceSaved);
  });
});
