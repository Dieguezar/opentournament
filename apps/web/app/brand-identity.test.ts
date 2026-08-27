import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readLocalFile = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('OpenTournament brand identity contract', () => {
  it('uses Inter and the approved symbol throughout the application shell', () => {
    const layout = readLocalFile('./layout.tsx');
    const header = readLocalFile('../components/header.tsx');

    expect(layout).toContain('@fontsource-variable/inter');
    expect(layout).not.toContain('Geist');
    expect(header).toContain('BrandLogo');
    expect(header).not.toContain('TrophyIcon');
  });

  it('keeps the approved component geometry in the global design tokens', () => {
    const css = readLocalFile('./showcase.css');

    expect(css).toContain('--canvas: #111318');
    expect(css).toContain('--primary: #4c7dff');
    expect(css).toContain('--font-interface:');
    expect(css).toContain('min-height: 2.5rem');
    expect(css).toContain('border-radius: 4px');
  });

  it('keeps focused forms at the readable narrow content width', () => {
    const formPages = [
      './login/page.tsx',
      './register/page.tsx',
      './verify-email/page.tsx',
      './wizard/page.tsx',
      './teams/new/page.tsx',
    ];

    for (const page of formPages) {
      expect(readLocalFile(page)).toContain('className="container narrow"');
    }
  });

  it('wraps header actions inside the mobile viewport', () => {
    const css = readLocalFile('./showcase.css');

    expect(css).toMatch(
      /@media \(max-width: 700px\)[\s\S]*?\.nav-actions \{[\s\S]*?flex-wrap: wrap;/,
    );
  });
});
