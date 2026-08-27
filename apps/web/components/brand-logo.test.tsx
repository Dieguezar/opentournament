import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BrandLogo } from './brand-logo';

describe('BrandLogo', () => {
  it('renders the official light and dark OpenTournament symbols', () => {
    const markup = renderToStaticMarkup(<BrandLogo />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('/brand/opentournament-symbol-on-dark.png');
    expect(markup).toContain('/brand/opentournament-symbol-on-light.png');
    expect(markup).toContain('width="82"');
    expect(markup).toContain('height="40"');
  });
});
