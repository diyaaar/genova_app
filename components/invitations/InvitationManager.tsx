'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthProvider';
import { invitationCommand, invitationStatus, type ChoirInvitation } from '@/lib/choir-invitations';

export default function InvitationManager() {
  const { activeChoir, isAdmin } = useAuth();
  const choirId = activeChoir?.choir_id;
  const allowed = isAdmin();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const query = useQuery({
    queryKey: ['choir-invitations', choirId],
    enabled: allowed && Boolean(choirId),
    queryFn: () => invitationCommand<{ invitations: ChoirInvitation[] }>({ action: 'list', choirId: choirId! }),
  });
  if (!allowed || !choirId) return <p>Bu alanı yalnız aktif koronun şefi kullanabilir.</p>;

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true); setMessage(''); setLink('');
    try {
      const result = await invitationCommand<{ token: string }>({
        action: 'create', choirId: choirId!, email: String(fields.get('email')),
        firstName: String(fields.get('firstName')), lastName: String(fields.get('lastName')),
        voiceGroup: String(fields.get('voiceGroup')),
      });
      setLink(`${window.location.origin}/invite#invite=${result.token}`);
      setMessage('Davet oluşturuldu. Bağlantıyı alıcıyla paylaşın; 7 gün geçerlidir.');
      form.reset();
      await query.refetch();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'İşlem başarısız.'); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setMessage('');
    try {
      await invitationCommand({ action: 'revoke', choirId: choirId!, invitationId: id });
      setLink(''); setMessage('Davet iptal edildi.'); await query.refetch();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'İşlem başarısız.'); }
    finally { setBusy(false); }
  }
  const inputStyle = 'w-full rounded border border-[var(--color-border)] bg-transparent p-3';
  return <section className="space-y-5">
    <h1 className="font-serif text-2xl">Koro davetleri</h1>
    <p>{activeChoir?.choir_name} için yeni Korist daveti oluşturun.</p>
    <form onSubmit={create} className="space-y-3">
      <label className="block">E-posta<input name="email" type="email" required maxLength={254} className={inputStyle} /></label>
      <label className="block">Ad<input name="firstName" required maxLength={80} className={inputStyle} /></label>
      <label className="block">Soyad<input name="lastName" required maxLength={80} className={inputStyle} /></label>
      <label className="block">Ses grubu<select name="voiceGroup" className={inputStyle}>
        {['Soprano', 'Alto', 'Tenor', 'Bass'].map(group => <option key={group}>{group}</option>)}
      </select></label>
      <button disabled={busy} className="rounded bg-[var(--color-accent)] p-3 text-black disabled:opacity-50">Davet oluştur</button>
    </form>
    <p className="text-sm">Aynı e-postaya yeni davet oluşturmak önceki bağlantıyı iptal eder. Son 100 davet gösterilir.</p>
    {message && <p role="status">{message}</p>}
    {link && <div className="space-y-2">
      <label className="block">Davet bağlantısı<input readOnly value={link} className={inputStyle} onFocus={event => event.target.select()} /></label>
      <button onClick={() => navigator.clipboard.writeText(link).then(() => setMessage('Bağlantı kopyalandı.')).catch(() => setMessage('Bağlantıyı seçip elle kopyalayabilirsiniz.'))}>Bağlantıyı kopyala</button>
    </div>}
    {query.isLoading && <p role="status">Davetler yükleniyor…</p>}
    {query.error && <p role="alert">{query.error.message} <button onClick={() => void query.refetch()}>Yeniden dene</button></p>}
    {query.data?.invitations.length === 0 && <p>Henüz davet yok.</p>}
    <ul className="space-y-3">{query.data?.invitations.map(invite => <li key={invite.id} className="rounded border border-[var(--color-border)] p-3">
      <p>{invite.first_name} {invite.last_name} — {invite.email}</p>
      <p>{invitationStatus(invite)}</p>
      {!invite.accepted_at && !invite.revoked_at && <button disabled={busy} onClick={() => void revoke(invite.id)}>Daveti iptal et</button>}
    </li>)}</ul>
  </section>;
}
