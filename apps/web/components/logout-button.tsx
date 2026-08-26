'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { apiClient } from '@/lib/api';

export function LogoutButton() {
  const { dictionary } = useI18n();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function logout() {
    setSubmitting(true);
    try {
      await apiClient('/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      className="button button-secondary"
      onClick={logout}
      disabled={submitting}
    >
      {submitting ? dictionary.navigation.loggingOut : dictionary.navigation.logout}
    </button>
  );
}
