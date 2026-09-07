'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  RECOVERY_PASSWORD_MAX_LENGTH,
  RECOVERY_PASSWORD_MIN_LENGTH,
  RECOVERY_REQUEST_NOTICE,
  validateRecoveryEmail,
  validateRecoveryPassword,
} from '@/lib/auth-recovery';

type RecoveryState =
  | 'checking'
  | 'ready'
  | 'saving'
  | 'complete'
  | 'invalid'
  | 'requesting'
  | 'requested';

export default function PasswordRecoveryPage() {
  const [state, setState] = useState<RecoveryState>('checking');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestEmail, setRequestEmail] = useState('');

  useEffect(() => {
    let active = true;
    let recoveryObserved = false;
    const hasRecoveryMarker = new URLSearchParams(window.location.search).get('recovery') === '1';

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || (hasRecoveryMarker && session)) {
        recoveryObserved = true;
        setState('ready');
      }
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (!sessionError && hasRecoveryMarker && data.session) {
        setState('ready');
      } else if (!recoveryObserved) {
        // Only the first resolution may fall back; a late answer must not undo
        // a reset request the reader has already sent.
        setState((current) => (current === 'checking' ? 'invalid' : current));
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Arriving here without a recovery session is the ordinary case: the page is
  // also the only place that can start a reset. Sending the link back to this
  // same URL with the marker is what makes the form below reachable at all.
  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validation = validateRecoveryEmail(requestEmail);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setState('requesting');
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(validation.email, {
        redirectTo: `${window.location.origin}/auth/recovery?recovery=1`,
      });
      if (requestError?.status === 429) {
        setError('Çok fazla deneme yapıldı. Birkaç dakika sonra yeniden deneyin.');
        setState('invalid');
        return;
      }
    } catch {
      setError('İstek gönderilemedi. Bağlantınızı kontrol edip yeniden deneyin.');
      setState('invalid');
      return;
    }
    // Everything else answers the same way, including an unknown address.
    setRequestEmail('');
    setState('requested');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validation = validateRecoveryPassword(password, confirmation);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setState('saving');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Şifre güncellenemedi. Kurtarma bağlantısı eskimiş olabilir.');
      setState('ready');
      return;
    }

    await supabase.auth.signOut({ scope: 'global' });
    setPassword('');
    setConfirmation('');
    setState('complete');
  };

  // The page answers two different questions depending on how the reader
  // arrived, so the heading follows the state rather than assuming a link.
  const requestMode = state === 'invalid' || state === 'requesting' || state === 'requested';

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[var(--color-background)] px-5 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_0%,var(--color-accent-soft),transparent_70%)]" />
      <section className="glass-panel relative z-10 w-full max-w-sm space-y-5 p-6">
        <div className="text-center">
          <h1 className="font-serif text-2xl tracking-tight text-[var(--color-text-high)]">
            {requestMode ? 'Şifre sıfırlama' : 'Yeni şifre belirle'}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-medium)]">
            {requestMode
              ? 'Hesabına yeni bir şifre belirlemek için sıfırlama bağlantısı iste.'
              : 'Genova hesabın için yalnız sana ait yeni bir şifre oluştur.'}
          </p>
        </div>

        {state === 'checking' && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--color-text-medium)]">
            <Loader2 className="animate-spin" size={18} /> Bağlantı doğrulanıyor…
          </div>
        )}

        {(state === 'invalid' || state === 'requesting') && (
          <form onSubmit={handleRequest} className="space-y-4">
            <p className="rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-medium)]">
              Geçerli bir kurtarma bağlantısı bulunamadı. E-posta adresinizi yazın, size
              yeni bir sıfırlama bağlantısı gönderelim.
            </p>
            <div className="space-y-2">
              <label htmlFor="recovery-email" className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-medium)]">
                E-posta
              </label>
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                required
                value={requestEmail}
                onChange={(event) => setRequestEmail(event.target.value)}
                className="editorial-input"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={state === 'requesting'}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-panel)] bg-[var(--color-accent)] py-3.5 text-sm font-bold text-[#1f170b] disabled:opacity-60"
            >
              {state === 'requesting' ? <><Loader2 className="animate-spin" size={17} /> Gönderiliyor…</> : 'Sıfırlama bağlantısı gönder'}
            </button>
            <Link href="/login" className="inline-flex text-sm font-semibold text-[var(--color-accent)]">
              Giriş sayfasına dön
            </Link>
          </form>
        )}

        {state === 'requested' && (
          <div className="space-y-4 text-center">
            <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              {RECOVERY_REQUEST_NOTICE}
            </p>
            <Link href="/login" className="inline-flex text-sm font-semibold text-[var(--color-accent)]">
              Giriş sayfasına dön
            </Link>
          </div>
        )}

        {(state === 'ready' || state === 'saving') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-medium)]">
                Yeni şifre
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={RECOVERY_PASSWORD_MIN_LENGTH}
                  maxLength={RECOVERY_PASSWORD_MAX_LENGTH}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="editorial-input pr-12"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-medium)]"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-medium)]">
                Yeni şifre tekrar
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={RECOVERY_PASSWORD_MIN_LENGTH}
                maxLength={RECOVERY_PASSWORD_MAX_LENGTH}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="editorial-input"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={state === 'saving'}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-panel)] bg-[var(--color-accent)] py-3.5 text-sm font-bold text-[#1f170b] disabled:opacity-60"
            >
              {state === 'saving' ? <><Loader2 className="animate-spin" size={17} /> Kaydediliyor…</> : 'Şifremi güncelle'}
            </button>
          </form>
        )}

        {state === 'complete' && (
          <div className="space-y-4 text-center">
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.
            </p>
            <Link href="/login" className="inline-flex text-sm font-semibold text-[var(--color-accent)]">
              Giriş sayfasına dön
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
