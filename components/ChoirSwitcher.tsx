'use client';

import { useEffect } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/ToastProvider';

export function ChoirSwitcher() {
  const { activeChoir, choirs, contextError, isSwitchingChoir, selectChoir } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (contextError) toast.error(contextError, 'Koro değiştirilemedi');
  }, [contextError, toast]);

  if (!activeChoir || choirs.length < 2) return null;

  return (
    <label className="min-w-0">
      <span className="sr-only">Aktif koroyu değiştir</span>
      <select
        aria-label="Aktif koroyu değiştir"
        value={activeChoir.choir_id}
        disabled={isSwitchingChoir}
        onChange={(event) => void selectChoir(event.target.value)}
        className="max-w-[8.5rem] truncate rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-solid)] px-2 py-1 text-[0.62rem] font-medium text-[var(--color-text-high)] outline-none focus:border-[var(--color-accent)] disabled:cursor-wait disabled:opacity-60 sm:max-w-[11rem]"
      >
        {choirs.map((choir) => (
          <option key={choir.choir_id} value={choir.choir_id}>
            {choir.choir_name}
          </option>
        ))}
      </select>
    </label>
  );
}
