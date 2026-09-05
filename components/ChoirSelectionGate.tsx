'use client';

import { Loader2, LogOut, Music2, RefreshCw } from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';

export function ChoirSelectionGate() {
  const {
    choirs,
    contextError,
    isSwitchingChoir,
    refreshChoirContext,
    selectChoir,
    signOut,
  } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-5 py-10">
      <section className="glass-panel w-full max-w-md p-6 text-center" aria-labelledby="choir-selection-title">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Music2 size={24} aria-hidden="true" />
        </div>
        <p className="page-kicker mb-2">GENOVA APP</p>
        <h1 id="choir-selection-title" className="font-serif text-2xl text-[var(--color-text-high)]">
          {choirs.length > 1 ? 'Çalışacağın koroyu seç' : 'Koro erişimi gerekli'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-medium)]">
          {choirs.length > 1
            ? 'Her oturum yalnızca seçtiğin koronun verilerini gösterir.'
            : 'Bu hesap için erişilebilir bir koro üyeliği bulunamadı.'}
        </p>

        {contextError ? (
          <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
            {contextError}
          </p>
        ) : null}

        {choirs.length > 0 ? (
          <div className="mt-6 grid gap-3">
            {choirs.map((choir) => (
              <button
                key={choir.choir_id}
                type="button"
                disabled={isSwitchingChoir}
                onClick={() => void selectChoir(choir.choir_id)}
                className="flex min-h-12 items-center justify-between rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-solid)] px-4 py-3 text-left text-sm font-medium text-[var(--color-text-high)] transition hover:border-[var(--color-accent)] disabled:cursor-wait disabled:opacity-60"
              >
                <span>{choir.choir_name}</span>
                {isSwitchingChoir ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void refreshChoirContext()}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Yeniden dene
          </button>
        )}

        <button
          type="button"
          onClick={() => void signOut()}
          className="mx-auto mt-5 flex min-h-10 items-center justify-center gap-2 px-3 text-sm text-[var(--color-text-medium)] hover:text-[var(--color-text-high)]"
        >
          <LogOut size={15} aria-hidden="true" />
          Çıkış yap
        </button>
      </section>
    </main>
  );
}
