import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import type { ChoirMembershipOption } from '@shared/choir-context-core';
import { createChatReadScope } from '@shared/chat-read-contract';
import { useAuth } from '../auth/AuthProvider';
import { ChatScreen } from '../chat/ChatScreen';
import type { NativeChatReadGateway } from '../chat/chat-read-gateway';
import type { NativeChatSendGateway } from '../chat/chat-send-gateway';
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
import type { AcceptedNotificationDeepLink } from '@shared/notification-deep-link';
import type { NativeNotificationGateway } from '../notifications/notification-gateway';
import { useNotificationRuntime } from '../notifications/use-notification-runtime';
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
  userId: string;
  activeChoir: ChoirMembershipOption;
  canSwitchChoir: boolean;
  repertoireGateway?: NativeRepertoireGateway;
  readerGateway?: NativeScoreReaderGateway;
  audioGateway?: NativeAudioSourceGateway;
  onSwitchChoir: () => void;
  onSignOut: () => void;
  getWebViewLease: ReturnType<typeof useAuth>['getWebViewLease'];
  changePassword: ReturnType<typeof useAuth>['changePassword'];
  notificationGateway?: NativeNotificationGateway;
  chatGateway?: NativeChatReadGateway;
  chatSendGateway?: NativeChatSendGateway;
}

function ReadyShellRoutes({
  userId,
  activeChoir,
  canSwitchChoir,
  repertoireGateway,
  readerGateway,
  onSwitchChoir,
  onSignOut,
  getWebViewLease,
  changePassword,
  notificationGateway,
  chatGateway,
  chatSendGateway,
}: Omit<ReadyShellProps, 'audioGateway'>) {
  const playback = useAudioPlayback();
  const [screen, setScreen] = useState<'home' | 'repertoire' | 'chat' | 'audio' | 'web'>('home');
  const [webPath, setWebPath] = useState('/announcements');
  const [repertoireSongId, setRepertoireSongId] = useState<string | null>(null);

  const openNotification = (destination: AcceptedNotificationDeepLink) => {
    if (destination.owner === 'web') {
      setWebPath(destination.canonicalPath);
      setScreen('web');
      return;
    }
    if (destination.routeFamily === 'repertoire') {
      const segments = destination.canonicalPath.split('/').filter(Boolean);
      setRepertoireSongId(segments.length > 1 ? segments.at(-1) ?? null : null);
      setScreen('repertoire');
      return;
    }
    setScreen('home');
  };
  const notifications = useNotificationRuntime({ gateway: notificationGateway, onOpen: openNotification });
  const chatScope = useMemo(() => createChatReadScope({
    userId,
    choirId: activeChoir.choir_id,
    memberId: activeChoir.member_id,
  }), [activeChoir.choir_id, activeChoir.member_id, userId]);

  useEffect(() => {
    if (screen === 'audio' && !playback.session) setScreen('repertoire');
  }, [playback.session, screen]);

  const openAudio = (session: NativeAudioSession) => {
    void playback.openSession(session);
    setScreen('audio');
  };

  let content;
  if (notifications.tapError) {
    content = (
      <StatusScreen
        title="Bildirim açılamadı"
        message={notifications.tapError}
        tone="error"
        actionLabel="Ana sayfaya dön"
        onAction={() => {
          notifications.clearTapError();
          setScreen('home');
        }}
        testID="notification-route-error"
      />
    );
  } else if (screen === 'web') {
    content = (
      <NativeWebViewScreen
        key={webPath}
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
  } else if (screen === 'chat') {
    content = chatScope ? (
      <ChatScreen
        scope={chatScope}
        choirName={activeChoir.choir_name}
        gateway={chatGateway}
        sendGateway={chatSendGateway}
        onBack={() => setScreen('home')}
      />
    ) : (
      <StatusScreen
        title="Sohbet açılamadı"
        message="Aktif koro üyeliği doğrulanamadı."
        tone="error"
        actionLabel="Ana sayfaya dön"
        onAction={() => setScreen('home')}
        testID="chat-scope-error"
      />
    );
  } else if (screen !== 'home') {
    content = (
      <RepertoireScreen
        choirId={activeChoir.choir_id}
        memberId={activeChoir.member_id}
        choirName={activeChoir.choir_name}
        gateway={repertoireGateway}
        readerGateway={readerGateway}
        initialSongId={repertoireSongId}
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
        notification={notificationGateway ? {
          permission: notifications.permission === 'unavailable' ? 'error' : notifications.permission,
          requesting: notifications.requestingPermission,
          message: notifications.permissionMessage,
          onRequest: () => void notifications.requestPermission(),
        } : undefined}
        onOpenRepertoire={() => {
          setRepertoireSongId(null);
          setScreen('repertoire');
        }}
        onOpenChat={() => setScreen('chat')}
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

export function AppRoot({ repertoireGateway, readerGateway, audioGateway, notificationGateway, chatGateway, chatSendGateway }: {
  repertoireGateway?: NativeRepertoireGateway;
  readerGateway?: NativeScoreReaderGateway;
  audioGateway?: NativeAudioSourceGateway;
  notificationGateway?: NativeNotificationGateway;
  chatGateway?: NativeChatReadGateway;
  chatSendGateway?: NativeChatSendGateway;
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
    const unregisterChat = chatGateway
      ? registerTenantCache(chatGateway.clear)
      : () => {};
    const unregisterChatSend = chatSendGateway
      ? registerTenantCache(chatSendGateway.clear)
      : () => {};
    return () => {
      unregisterCatalogue();
      unregisterReader();
      unregisterChat();
      unregisterChatSend();
    };
  }, [chatGateway, chatSendGateway, readerGateway, repertoireGateway]);

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

  if (auth.phase === 'ready' && auth.activeChoir && auth.user) {
    return (
      <>
        <StatusBar style="light" />
        <ReadyShell
          key={auth.activeChoir.choir_id}
          userId={auth.user.id}
          activeChoir={auth.activeChoir}
          canSwitchChoir={auth.choirs.length > 1}
          repertoireGateway={repertoireGateway}
          readerGateway={readerGateway}
          audioGateway={audioGateway}
          onSwitchChoir={() => setSwitching(true)}
          onSignOut={() => void auth.signOut()}
          getWebViewLease={auth.getWebViewLease}
          changePassword={auth.changePassword}
          notificationGateway={notificationGateway}
          chatGateway={chatGateway}
          chatSendGateway={chatSendGateway}
        />
      </>
    );
  }

  return <StatusScreen title="Genova" message="Hazırlanıyor…" busy testID="fallback-screen" />;
}

const styles = StyleSheet.create({
  readyShell: { flex: 1, backgroundColor: theme.colors.background },
});
