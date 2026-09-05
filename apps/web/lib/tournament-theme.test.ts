import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { contrastRatio, deriveTournamentTokens, tournamentThemeStyle } from './tournament-theme';

describe('tournament-scoped page themes', () => {
  it('preserves site defaults for null and invalid colors', () => {
    expect(tournamentThemeStyle(null)).toEqual({});
    expect(tournamentThemeStyle({ primaryColor: null, accentColor: null })).toEqual({});
    expect(tournamentThemeStyle({ primaryColor: 'red', accentColor: 'url(unsafe)' })).toEqual({});
  });

  it('derives both modes without changing semantic status tokens', () => {
    const style = tournamentThemeStyle({ primaryColor: '#10B981', accentColor: '#A3E635' });
    expect(style['--canvas']).toMatch(/^light-dark\(#[a-f0-9]{6}, #[a-f0-9]{6}\)$/);
    expect(style['--surface']).not.toBe(style['--canvas']);
    expect(style['--action-primary']).toContain('#10B981');
    for (const semantic of ['--success', '--warning', '--danger', '--action-danger']) {
      expect(style).not.toHaveProperty(semantic);
    }
    expect(
      tournamentThemeStyle({ primaryColor: null, accentColor: '#A3E635' })['--border'],
    ).toBeTruthy();
  });

  it('confines styles to their rendered wrapper and leaves unconfigured siblings alone', () => {
    const markup = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement('main', {
          id: 'custom',
          style: tournamentThemeStyle({ primaryColor: '#8B5CF6', accentColor: null }),
        }),
        createElement('main', { id: 'default', style: tournamentThemeStyle(null) }),
      ),
    );
    expect(markup).toContain('id="custom" style="--canvas:');
    expect(markup).toContain('<main id="default"></main>');
    expect(markup).not.toContain('<style');
  });

  it.each([true, false])('keeps text, links and action labels readable, dark=%s', (dark) => {
    for (const primary of [
      '#000000',
      '#FFFFFF',
      '#FF0000',
      '#00FF00',
      '#0000FF',
      '#FFFF00',
      '#8B5CF6',
      '#10B981',
    ]) {
      for (const accent of ['#FFFFFF', '#000000', '#F472B6']) {
        const tokens = deriveTournamentTokens(primary, accent, dark);
        for (const background of [tokens.canvas, tokens.surface, tokens['surface-raised']]) {
          expect(contrastRatio(tokens.text, background)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(tokens['text-muted'], background)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(tokens.primary, background)).toBeGreaterThanOrEqual(4.5);
          expect(
            contrastRatio(tokens['tournament-game-accent'], background),
          ).toBeGreaterThanOrEqual(4.5);
        }
        expect(
          contrastRatio(tokens['on-primary'], tokens['action-primary']),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(tokens['on-primary'], tokens['action-primary-hover']),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
