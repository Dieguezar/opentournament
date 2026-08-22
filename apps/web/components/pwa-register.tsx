'use client';

import { useEffect } from 'react';
import { cleanupDevelopmentPwa, getPwaRuntimeAction } from '@/lib/pwa-cache';

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (getPwaRuntimeAction(process.env.NODE_ENV) === 'cleanup') {
      const cacheStorage = 'caches' in window ? window.caches : undefined;
      void cleanupDevelopmentPwa(navigator.serviceWorker, cacheStorage).catch(() => undefined);
      return;
    }
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}
