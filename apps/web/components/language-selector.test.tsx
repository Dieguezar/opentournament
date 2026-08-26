import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LanguageSelectorView } from './language-selector';
import { getDictionary } from '../lib/i18n';

describe('LanguageSelector', () => {
  it('renders both supported languages and exposes the current English selection', () => {
    const markup = renderToStaticMarkup(
      <LanguageSelectorView
        dictionary={getDictionary('en')}
        locale="en"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Language"');
    expect(markup).toContain('<option value="es">Español</option>');
    expect(markup).toContain('<option value="en" selected="">English</option>');
  });
});
