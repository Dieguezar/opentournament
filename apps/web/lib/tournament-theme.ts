import type { CSSProperties } from 'react';

interface Palette {
  primaryColor: string | null;
  accentColor: string | null;
}

type RGB = [number, number, number];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function rgb(hex: string): RGB {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function mix(color: string, base: string, weight: number): string {
  const background = rgb(base);
  const foreground = rgb(color);
  return (
    '#' +
    ([0, 1, 2] as const)
      .map((index) =>
        Math.round(foreground[index] * weight + background[index] * (1 - weight))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

function luminance(color: string): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const [red, green, blue] = rgb(color);
  return linear(red) * 0.2126 + linear(green) * 0.7152 + linear(blue) * 0.0722;
}

export function contrastRatio(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function readable(color: string, backgrounds: string[], target: string, minimum = 4.5): string {
  for (let step = 0; step <= 20; step += 1) {
    const candidate = mix(target, color, step / 20);
    if (backgrounds.every((background) => contrastRatio(candidate, background) >= minimum)) {
      return candidate;
    }
  }
  return target;
}

export function deriveTournamentTokens(primary: string, accent: string, dark: boolean) {
  const canvas = mix(primary, dark ? '#111318' : '#f7f8fa', dark ? 0.18 : 0.1);
  const surface = mix(primary, dark ? '#171a21' : '#ffffff', dark ? 0.14 : 0.045);
  const raised = mix(accent, dark ? '#1d212a' : '#f1f3f6', dark ? 0.12 : 0.065);
  const backgrounds = [canvas, surface, raised, mix(primary, surface, 0.12)];
  const endpoint = dark ? '#ffffff' : '#000000';
  const link = readable(primary, backgrounds, endpoint);
  const highlight = readable(accent, backgrounds, endpoint);
  const onAction =
    contrastRatio(primary, '#ffffff') >= contrastRatio(primary, '#000000') ? '#ffffff' : '#000000';

  return {
    canvas,
    surface,
    'surface-raised': raised,
    'canvas-subtle': raised,
    'control-background': surface,
    'match-card-background': raised,
    'badge-neutral-background': raised,
    'badge-primary-background': raised,
    border: mix(accent, dark ? '#2b303b' : '#d9dee7', 0.35),
    text: dark ? '#f4f6f8' : '#111827',
    'text-muted': readable(dark ? '#a8b0bf' : '#5b6472', backgrounds, endpoint),
    primary: link,
    'primary-strong': link,
    'primary-soft': raised,
    'tournament-heading': link,
    'tournament-game-accent': highlight,
    'action-primary': primary,
    'action-primary-hover': mix(onAction === '#ffffff' ? '#000000' : '#ffffff', primary, 0.12),
    'on-primary': onAction,
  };
}

// Local inheritance avoids document-level mutations and route-transition theme leaks.
export function tournamentThemeStyle(
  palette: Palette | null,
): CSSProperties & Record<`--${string}`, string> {
  const primary =
    palette?.primaryColor && HEX_COLOR.test(palette.primaryColor) ? palette.primaryColor : null;
  const accent =
    palette?.accentColor && HEX_COLOR.test(palette.accentColor) ? palette.accentColor : null;
  if (!primary && !accent) return {};

  const light = deriveTournamentTokens(primary ?? '#4C7DFF', accent ?? primary ?? '#4C7DFF', false);
  const dark = deriveTournamentTokens(primary ?? '#4C7DFF', accent ?? primary ?? '#4C7DFF', true);
  const pairs = Object.entries(light).map(([token, value]) => [
    `--${token}`,
    `light-dark(${value}, ${dark[token as keyof typeof dark]})`,
  ]);
  return { ...Object.fromEntries(pairs), '--bg': 'var(--canvas)', '--muted': 'var(--text-muted)' };
}
