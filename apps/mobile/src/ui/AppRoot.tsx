import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import type { ChoirMembershipOption } from '@shared/choir-context-core';
import { useAuth } from '../auth/AuthProvider';
import { RepertoireScreen } from '../repertoire/RepertoireScreen';
import type { NativeRepertoireGateway } from '../repertoire/catalog-gateway';
import type { NativeScoreReaderGateway } from '../repertoire/reader-contract';
import { registerTenantCache } from '../auth/tenant-cache';
import { ChoirSelectScreen } from './ChoirSelectScreen';
import { ShellScreen } from './ShellScreen';
import { SignInScreen } from './SignInScreen';
import { StatusScreen } from './StatusScreen';

/**
 * Single place that maps auth phase to screen. Only the `ready` phase may reach a data
 * screen; every other phase renders sign-in, a choice or an explicit status.
 */
function ReadyShell({
  activeChoir,
  canSwitchChoir,
  repertoireGateway,
  readerGateway,
  onSwitchChoir,
  onSignOut,
}: {
  activeChoir: ChoirMembershipOption;
  canSwitchChoir: boolean;
  repertoireGateway?: NativeRepertoireGateway;
  readerGateway?: NativeScoreReaderGateway;
  onSwitchChoir: () => void;
  onSignOut: () => void;
}) {
  const [screen, setScreen] = useState<'home' | 'repertoire'>('home');

  if (screen === 'repertoire') {
    return (
      <RepertoireScreen
        choirId={activeChoir.choir_id}
        memberId={activeChoir.member_id}
        choirName={activeChoir.choir_name}
        gateway={repertoireGateway}
        readerGateway={readerGateway}
        canSwitchChoir={canSwitchChoir}
        onBack={() => setScreen('home')}
        onSwitchChoir={onSwitchChoir}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <ShellScreen
      activeChoir={activeChoir}
      canSwitchChoir={canSwitchChoir}
      onOpenRepertoire={() => setScreen('repertoire')}
      onSwitchChoir={onSwitchChoir}
      onSignOut={onSignOut}
    />
  );
}

export function AppRoot({ repertoireGateway, readerGateway }: {
  repertoireGateway?: NativeRepertoireGateway;
  readerGateway?: NativeScoreReaderGateway;
} = {}) {
  const auth = useAuth();
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    // Injected gateways belong to the app-level caller. Keep their cleaners alive even while
    // their screens are unmounted so a choir switch from the shell cannot retain old tenant data.
    const unregisterCatalogue = repertoireGateway
      ? registerTenantCache(repertoireGateway.clear)
      : () => {};
    const unregisterReader = readerGateway
      ? registerTenantCache(readerGateway.clear)
      : () => {};
    return () => {
      unregisterCatalogue();
      unregisterReader();
    };
  }, [readerGateway, repertoireGateway]);

  const showSelection = auth.phase === 'selection-required' || (switching && auth.choirs.length > 1);

  if (auth.phase === 'loading') {
    return <StatusScreen title="Genova" message="Oturum kontrol ediliyor…" busy testID="loading-screen" />;
  }

  if (auth.phase === 'signed-out') {
    return (
      <>
        <StatusBar style="light" />
        <SignInScreen onSignIn={auth.signIn} />
      </>
    );
  }

  if (auth.phase === 'no-membership') {
    return (
      <StatusScreen
        title="Koro üyeliğiniz yok"
        message="Bu hesap henüz bir koroya bağlı değil. Koro şefinizden davet isteyin."
        actionLabel="Çıkış yap"
        onAction={() => void auth.signOut()}
        testID="no-membership-screen"
      />
    );
  }

  if (auth.phase === 'error') {
    return (
      <StatusScreen
        title="Koro bilgileri yüklenemedi"
        message={auth.errorMessage ?? undefined}
        tone="error"
        actionLabel="Tekrar dene"
        onAction={() => void auth.refresh()}
        testID="context-error-screen"
      />
    );
  }

  if (showSelection) {
    return (
      <ChoirSelectScreen
        options={auth.choirs}
        errorMessage={auth.errorMessage}
        busy={auth.isSwitchingChoir}
        onSelect={(choirId) => {
          setSwitching(false);
          void auth.selectChoir(choirId);
        }}
        onSignOut={() => void auth.signOut()}
      />
    );
  }

  if (auth.phase === 'ready' && auth.activeChoir) {
    return (
      <>
        <StatusBar style="light" />
        <ReadyShell
          key={auth.activeChoir.choir_id}
          activeChoir={auth.activeChoir}
          canSwitchChoir={auth.choirs.length > 1}
          repertoireGateway={repertoireGateway}
          readerGateway={readerGateway}
          onSwitchChoir={() => setSwitching(true)}
          onSignOut={() => void auth.signOut()}
        />
      </>
    );
  }

  return <StatusScreen title="Genova" message="Hazırlanıyor…" busy testID="fallback-screen" />;
}
