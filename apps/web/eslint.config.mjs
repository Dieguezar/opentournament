import base from '../../eslint.base.mjs';

export default [
  ...base,
  {
    // El service worker usa globals de workers (self, caches).
    ignores: ['public/sw.js'],
  },
];
