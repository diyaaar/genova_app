'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { invitationCommand, invitationTokenFromHash } from '@/lib/choir-invitations';
import {
  browserInviteTokenStorage,
  forgetInviteToken,
  readInviteToken,
  rememberInviteToken,
} from '@/lib/invite-token-store';

export default function AcceptInvitationPage() {
  const { user, isLoading, signIn, signOut } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const read = () => {
      const storage = browserInviteTokenStorage();
      const fromLink = invitationTokenFromHash(window.location.hash);
      // The link is authoritative; storage only carries it across the
      // verification round trip, whose redirect cannot keep the fragment.
      if (fromLink) rememberInviteToken(storage, fromLink);
      setToken(fromLink ?? readInviteToken(storage));
      setReady(true);
    };
    read(); window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email')).trim();
    const password = String(fields.get('password'));
    setBusy(true); setMessage('');
    try {
      if (register) {
        const result = await supabase.auth.signUp({
          email,
          password,
          // Without this the provider returns to the site root, where a member
          // without a choir is stopped by the membership gate and the invitation
          // is lost. The token itself stays out of the URL and waits in storage.
          options: { emailRedirectTo: `${window.location.origin}/invite` },
        });
        if (result.error) throw new Error('Kayıt tamamlanamadı. Bilgilerinizi kontrol edin veya giriş yapmayı deneyin.');
        setMessage('Doğrulama e-postanızı kontrol edin. Doğruladıktan sonra bu sayfaya geri döneceksiniz; dönmezseniz size gönderilen davet bağlantısını yeniden açın.');
      } else {
        const result = await signIn(email, password);
        if (result.error) throw new Error('E-posta veya şifre hatalı; e-posta doğrulamanızı da kontrol edin.');
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Giriş tamamlanamadı.'); }
    finally { setBusy(false); }
  }
  async function accept() {
    if (!token) return;
    setBusy(true); setMessage('');
    try {
      await invitationCommand({ action: 'accept', token });
      forgetInviteToken(browserInviteTokenStorage());
      // Full reload rebuilds membership/tenant caches; multi-choir users select explicitly.
      window.location.replace('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Davet kabul edilemedi.');
      setBusy(false);
    }
  }
  const inputStyle = 'w-full rounded border border-[var(--color-border)] bg-transparent p-3';
  return <main className="mx-auto min-h-screen max-w-md space-y-5 px-5 py-12">
    <h1 className="font-serif text-2xl">Koro daveti</h1>
    {(!ready || isLoading) ? <p role="status">Yükleniyor…</p> : !token ? <p role="alert">Davet bağlantısı eksik veya geçersiz. Size gönderilen bağlantıyı yeniden açın.</p> : user ? <>
      <p>{user.email} hesabıyla daveti kabul edeceksiniz.</p>
      <p>Yalnız davetin gönderildiği doğrulanmış e-posta hesabı katılabilir.</p>
      <button disabled={busy} onClick={() => void accept()} className="rounded bg-[var(--color-accent)] p-3 text-black disabled:opacity-50">{busy ? 'İşleniyor…' : 'Daveti kabul et'}</button>
      <button disabled={busy} onClick={() => void signOut().catch(() => setMessage('Çıkış yapılamadı. Yeniden deneyin.'))} className="block">Başka hesapla giriş yap</button>
    </> : <>
      <p>Davetin gönderildiği e-postayla {register ? 'hesap oluşturun' : 'giriş yapın'}.</p>
      <form onSubmit={authenticate} className="space-y-3">
        <label className="block">E-posta<input name="email" type="email" autoComplete="email" required className={inputStyle} /></label>
        <label className="block">Şifre<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 12 : undefined} required className={inputStyle} /></label>
        <button disabled={busy} className="rounded bg-[var(--color-accent)] p-3 text-black disabled:opacity-50">{register ? 'Hesap oluştur' : 'Giriş yap'}</button>
      </form>
      <button disabled={busy} onClick={() => { setRegister(!register); setMessage(''); }}>{register ? 'Hesabım var, giriş yap' : 'Hesabım yok, kayıt ol'}</button>
      <Link href="/auth/recovery" className="block">Şifremi unuttum</Link>
    </>}
    {message && <p role="status">{message}</p>}
    <Link href="/">Ana sayfaya dön</Link>
  </main>;
}
