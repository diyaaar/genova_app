import Link from 'next/link';
import InvitationManager from '@/components/invitations/InvitationManager';

export default function InvitationsPage() {
  return <main className="page-shell space-y-5 pb-28">
    <Link href="/koristler">Koristlere dön</Link>
    <InvitationManager />
  </main>;
}
