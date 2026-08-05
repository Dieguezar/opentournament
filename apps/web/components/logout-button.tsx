'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiClient } from '@/lib/api';

export function LogoutButton() {
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
    <button type="button" className="button button-secondary" onClick={logout} disabled={submitting}>
      Cerrar sesión
    </button>
  );
}
