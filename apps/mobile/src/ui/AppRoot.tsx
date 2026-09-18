import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import type { ChoirMembershipOption } from '@shared/choir-context-core';
import { useAuth } from '../auth/AuthProvider';
import { AudioPlaybackProvider, useAudioPlayback } from '../repertoire/AudioPlaybackProvider';
import { AudioPlayerScreen } from '../repertoire/AudioPlayerScreen';
import { MiniAudioPlayer } from '../repertoire/MiniAudioPlayer';
import { RepertoireScreen } from '../repertoire/RepertoireScreen';
import type { NativeAudioSession } from '../repertoire/audio-contract';
import type { NativeAudioSourceGateway } from '../repertoire/audio-source-gateway';
import type { NativeRepertoireGateway } from '../repertoire/catalog-gateway';
import type { NativeScoreReaderGateway } from '../repertoire/reader-contract';
import { NativeWebViewScreen } from '../webview/NativeWebViewScreen';
import { registerTenantCache } from '../auth/tenant-cache';
import { ChoirSelectScreen } from './ChoirSelectScreen';
import { ShellScreen } from './ShellScreen';
import { SignInScreen } from './SignInScreen';
import { StatusScreen } from './StatusScreen';
import { theme } from './theme';

/**
 * Single place that maps auth phase to screen. Only the `ready` phase may reach a data
 * screen; every other phase renders sign-in, a choice or an explicit status.
 */
interface ReadyShellProps {
  activeChoir: ChoirMembershipOption;
  canSwitchChoir: boolean;
  repertoireGateway?: NativeRepertoireGateway;
  readerGateway?: NativeScoreReaderGateway;
  audioGateway?: NativeAudioSourceGateway;
  onSwitchChoir: () => void;
  onSignOut: () => void;
  getWebViewLease: ReturnType<typeof useAuth>['getWebViewLease'];
  changePassword: ReturnType<typeof useAuth>['changePassword'];
}

function ReadyShellRoutes({
  activeChoir,
  canSwitchChoir,
  repertoireGateway,
  readerGateway,
  onSwitchChoir,
  onSignOut,
  getWebViewLease,
  changePassword,
}: Omit<ReadyShellProps, 'audioGateway'>) {
  const playback = useAudioPlayback();
  const [screen, setScreen] = useState<'home' | 'repertoire' | 'audio' | 'web'>('home');
  const [webPath, setWebPath] = useState('/announcements');

  useEffect(() => {
    if (screen === 'audio' && !playback.session) setScreen('repertoire');
  }, [playback.session, screen]);

  const openAudio = (session: NativeAudioSession) => {
    void playback.openSession(session);
    setScreen('audio');
  };

  let content;
  if (screen === 'web') {
    content = (
      <NativeWebViewScreen
        initialPath={webPath}
        getLease={getWebViewLease}
        onNativeRoute={(route) => setScreen(route === 'repertoire' ? 'repertoire' : 'home')}
        onExit={() => setScreen('home')}
        onSignOut={onSignOut}
        changePassword={changePassword}
      />
    );
  } else if (screen === 'audio' && playback.session) {
    content = <AudioPlayerScreen onBack={() => setScreen('repertoire')} />;
  } else if (screen !== 'home') {
    content = (
      <RepertoireScreen
        choirId={activeChoir.choir_id}
        memberId={activeChoir.member_id}
        choirName={activeChoir.choir_name}
        gateway={repertoireGateway}
        readerGateway={readerGateway}
        canSwitchChoir={canSwitchChoir}
        onOpenAudio={openAudio}
        onBack={() => setScreen('home')}
        onSwitchChoir={onSwitchChoir}
        onSignOut={onSignOut}
      />
    );
  } else {
    content = (
      <ShellScreen
        activeChoir={activeChoir}
        canSwitchChoir={canSwitchChoir}
        onOpenRepertoire={() => setScreen('repertoire')}
        onOpenWeb={(path) => {
          setWebPath(path);
          setScreen('web');
        }}
        onSwitchChoir={onSwitchChoir}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <View style={styles.readyShell} testID="ready-shell">
      {content}
      {screen !== 'audio' ? <MiniAudioPlayer onOpen={() => setScreen('audio')} /> : null}
    </View>
  );
}

function ReadyShell({ audioGateway, ...routeProps }: ReadyShellProps) {
  return (
    <AudioPlaybackProvider gateway={audioGateway}>
      <ReadyShellRoutes {...routeProps} />
    </AudioPlaybackProvider>
  );
}

export function AppRoot({ repertoireGateway, readerGateway, audioGateway }: {
  repertoireGateway?: NativeRepertoireGateway;
  readerGateway?: NativeScoreReaderGateway;
  audioGateway?: NativeAudioSourceGateway;
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
        title={auth.user ? 'Koro bilgileri yüklenemedi' : 'Oturum açılamadı'}
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
          audioGateway={audioGateway}
          onSwitchChoir={() => setSwitching(true)}
          onSignOut={() => void auth.signOut()}
          getWebViewLease={auth.getWebViewLease}
          changePassword={auth.changePassword}
        />
      </>
    );
  }

  return <StatusScreen title="Genova" message="Hazırlanıyor…" busy testID="fallback-screen" />;
}

const styles = StyleSheet.create({
  readyShell: { flex: 1, backgroundColor: theme.colors.background },
});
