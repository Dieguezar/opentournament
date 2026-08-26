import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from './i18n-provider';
import { ParticipantAccessSecret } from './participant-access-secret';
import { getDictionary } from '../lib/i18n';

describe('ParticipantAccessSecret', () => {
  it('renders a local, accessible QR alongside the one-time link', () => {
    const url = 'http://localhost:3000/access#token=temporary-secret';
    const markup = renderToStaticMarkup(
      <I18nProvider dictionary={getDictionary('es')} locale="es">
        <ParticipantAccessSecret teamName="Aurora Gaming" url={url} onCopy={() => undefined} />
      </I18nProvider>,
    );

    expect(markup).toContain('<svg');
    expect(markup).toContain('<title>Acceso privado para Aurora Gaming</title>');
    expect(markup).toContain('fill="#ffffff"');
    expect(markup).toContain('fill="#111827"');
    expect(markup).toContain('Escaneá el QR con el teléfono del participante');
    expect(markup).toContain('El QR se genera en este navegador');
    expect(markup).toContain(`value="${url}"`);
  });

  it('renders the one-time access guidance in English', () => {
    const markup = renderToStaticMarkup(
      <I18nProvider dictionary={getDictionary('en')} locale="en">
        <ParticipantAccessSecret
          teamName="Northern Lights"
          url="http://localhost:3000/access#token=secret"
          onCopy={() => undefined}
        />
      </I18nProvider>,
    );

    expect(markup).toContain('<title>Private access for Northern Lights</title>');
    expect(markup).toContain('Scan the QR code with the participant’s phone');
    expect(markup).toContain('The QR code is generated in this browser');
  });
});
