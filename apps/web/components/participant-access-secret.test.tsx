import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ParticipantAccessSecret } from './participant-access-secret';

describe('ParticipantAccessSecret', () => {
  it('renders a local, accessible QR alongside the one-time link', () => {
    const url = 'http://localhost:3000/access#token=temporary-secret';
    const markup = renderToStaticMarkup(
      createElement(ParticipantAccessSecret, {
        teamName: 'Aurora Gaming',
        url,
        onCopy: () => undefined,
      }),
    );

    expect(markup).toContain('<svg');
    expect(markup).toContain('<title>Acceso privado para Aurora Gaming</title>');
    expect(markup).toContain('fill="#ffffff"');
    expect(markup).toContain('fill="#111827"');
    expect(markup).toContain('Escaneá el QR con el teléfono del participante');
    expect(markup).toContain('El QR se genera en este navegador');
    expect(markup).toContain(`value="${url}"`);
  });
});
