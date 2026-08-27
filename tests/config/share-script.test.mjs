import assert from 'node:assert/strict';
import test from 'node:test';
import { extractQuickTunnelUrl } from '../../scripts/share.mjs';

test('extracts a Quick Tunnel URL from prefixed Compose logs', () => {
  const output =
    'cloudflared-1 | INF Your quick Tunnel has been created! Visit it at https://sample-name.trycloudflare.com';

  assert.equal(extractQuickTunnelUrl(output), 'https://sample-name.trycloudflare.com');
});

test('does not mistake unrelated HTTPS URLs for the public tunnel', () => {
  assert.equal(extractQuickTunnelUrl('Documentation: https://developers.cloudflare.com'), null);
});
