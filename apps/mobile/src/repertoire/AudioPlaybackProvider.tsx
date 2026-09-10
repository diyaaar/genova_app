import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioSource,
} from 'expo-audio';
import { registerTenantCache } from '../auth/tenant-cache';
import {
  clampAudioPosition,
  getNextPlaybackRate,
  shouldRefreshAudioTicket,
  type NativeAudioSession,
} from './audio-contract';
import type { NativeAudioSourceGateway } from './audio-source-gateway';
import { getDefaultAudioSourceGateway } from './default-audio-source-gateway';

interface LoadOptions {
  autoplay?: boolean;
  resumeAt?: number;
}

interface PendingPlayback {
  requestVersion: number;
  autoplay: boolean;
  resumeAt: number;
}

export interface NativeAudioPlayback {
  session: NativeAudioSession | null;
  selectedIndex: number;
  selectedTrack: NativeAudioSession['tracks'][number] | null;
  ticketExpiresAt: number | null;
  loadingTicket: boolean;
  error: string | null;
  playbackRate: number;
  currentTime: number;
  duration: number;
  playing: boolean;
  buffering: boolean;
  loaded: boolean;
  busy: boolean;
  canControl: boolean;
  openSession(session: NativeAudioSession): Promise<void>;
  loadTrack(index: number, options?: LoadOptions): Promise<void>;
  togglePlayback(): Promise<void>;
  seekTo(seconds: number): Promise<void>;
  changeRate(): void;
  retry(): Promise<void>;
  close(): void;
}

const AudioPlaybackContext = createContext<NativeAudioPlayback | null>(null);

export function AudioPlaybackProvider({
  gateway: suppliedGateway,
  children,
}: PropsWithChildren<{ gateway?: NativeAudioSourceGateway }>) {
  const gatewayRef = useRef<NativeAudioSourceGateway | null>(suppliedGateway ?? null);
  const getGateway = useCallback(() => {
    if (!gatewayRef.current) gatewayRef.current = getDefaultAudioSourceGateway();
    return gatewayRef.current;
  }, []);
  const [session, setSession] = useState<NativeAudioSession | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [audioSource, setAudioSource] = useState<AudioSource>(null);
  const player = useAudioPlayer(audioSource, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [ticketExpiresAt, setTicketExpiresAt] = useState<number | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRateRef = useRef(1);
  const playerRef = useRef(player);
  const requestVersion = useRef(0);
  const pendingPlayback = useRef<PendingPlayback | null>(null);
  const playbackLoadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  playerRef.current = player;

  const clearPlaybackLoadTimer = useCallback(() => {
    if (playbackLoadTimer.current) clearTimeout(playbackLoadTimer.current);
    playbackLoadTimer.current = null;
  }, []);

  const startPlaybackLoadTimer = useCallback(() => {
    clearPlaybackLoadTimer();
    playbackLoadTimer.current = setTimeout(() => {
      playbackLoadTimer.current = null;
      playerRef.current.pause();
      setError('Ses dosyası oynatılamadı. Yeniden deneyin.');
    }, 8_000);
  }, [clearPlaybackLoadTimer]);

  const disposePrivatePlayback = useCallback(() => {
    requestVersion.current += 1;
    pendingPlayback.current = null;
    clearPlaybackLoadTimer();
    gatewayRef.current?.clear();
    playerRef.current.pause();
  }, [clearPlaybackLoadTimer]);

  const clearSession = useCallback(() => {
    disposePrivatePlayback();
    setSession(null);
    setSelectedIndex(0);
    setAudioSource(null);
    setTicketExpiresAt(null);
    setLoadingTicket(false);
    setError(null);
    playbackRateRef.current = 1;
    setPlaybackRate(1);
  }, [disposePrivatePlayback]);

  const loadTrackForSession = useCallback(async (
    targetSession: NativeAudioSession,
    index: number,
    { autoplay = false, resumeAt = 0 }: LoadOptions = {},
  ) => {
    const track = targetSession.tracks[index];
    if (!track) return;
    playerRef.current.pause();
    setSelectedIndex(index);
    setTicketExpiresAt(null);
    setError(null);
    pendingPlayback.current = null;
    setAudioSource(null);
    if (!track.supported) {
      requestVersion.current += 1;
      gatewayRef.current?.clear();
      setLoadingTicket(false);
      setError('Bu ses biçimi mobil oynatıcıda desteklenmiyor.');
      return;
    }

    const version = ++requestVersion.current;
    setLoadingTicket(true);
    try {
      const ticket = await getGateway().open(track.file.id);
      if (requestVersion.current !== version) return;
      pendingPlayback.current = { requestVersion: version, autoplay, resumeAt };
      setTicketExpiresAt(ticket.expiresAt);
      setAudioSource({ uri: ticket.url, name: track.label });
      if (autoplay) startPlaybackLoadTimer();
    } catch (loadError) {
      if (requestVersion.current !== version) return;
      setError(loadError instanceof Error ? loadError.message : 'Ses dosyası açılamadı.');
    } finally {
      if (requestVersion.current === version) setLoadingTicket(false);
    }
  }, [getGateway, startPlaybackLoadTimer]);

  const openSession = useCallback(async (nextSession: NativeAudioSession) => {
    setSession(nextSession);
    setSelectedIndex(0);
    playbackRateRef.current = 1;
    setPlaybackRate(1);
    await loadTrackForSession(nextSession, 0);
  }, [loadTrackForSession]);

  const loadTrack = useCallback(async (index: number, options?: LoadOptions) => {
    if (!session) return;
    await loadTrackForSession(session, index, options);
  }, [loadTrackForSession, session]);

  useEffect(() => {
    const unregisterPlayer = registerTenantCache(clearSession);
    return () => {
      unregisterPlayer();
      disposePrivatePlayback();
    };
  }, [clearSession, disposePrivatePlayback]);

  useEffect(() => {
    if (ticketExpiresAt !== null) player.setPlaybackRate(playbackRateRef.current);
  }, [player, ticketExpiresAt]);

  useEffect(() => {
    const pending = pendingPlayback.current;
    if (!pending || !status.isLoaded || pending.requestVersion !== requestVersion.current) return;
    pendingPlayback.current = null;
    const resumeAt = clampAudioPosition(pending.resumeAt, status.duration);
    const resume = async () => {
      if (resumeAt > 0) await player.seekTo(resumeAt);
      if (pending.autoplay) player.play();
    };
    void resume().catch(() => setError('Ses kaldığı yerden başlatılamadı.'));
  }, [player, status.duration, status.isLoaded, ticketExpiresAt]);

  useEffect(() => {
    if (status.isLoaded || status.playing || status.error) clearPlaybackLoadTimer();
    if (status.error) setError('Ses dosyası oynatılamadı. Yeniden deneyin.');
  }, [clearPlaybackLoadTimer, status.error, status.isLoaded, status.playing]);

  const selectedTrack = session?.tracks[selectedIndex] ?? null;
  const hasSource = ticketExpiresAt !== null;
  const currentTime = hasSource ? status.currentTime : 0;
  const duration = hasSource ? status.duration : 0;
  const canControl = hasSource && status.isLoaded;

  const togglePlayback = useCallback(async () => {
    if (!selectedTrack || loadingTicket || error || ticketExpiresAt === null) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (shouldRefreshAudioTicket(ticketExpiresAt)) {
      await loadTrack(selectedIndex, { autoplay: true, resumeAt: status.currentTime });
      return;
    }
    if (!status.isLoaded) startPlaybackLoadTimer();
    player.play();
  }, [error, loadTrack, loadingTicket, player, selectedIndex, selectedTrack, startPlaybackLoadTimer, status.currentTime, status.isLoaded, status.playing, ticketExpiresAt]);

  const seekTo = useCallback(async (seconds: number) => {
    if (ticketExpiresAt === null || !status.isLoaded || status.duration <= 0) return;
    try {
      await player.seekTo(clampAudioPosition(seconds, status.duration));
    } catch {
      setError('Ses içinde istenen konuma gidilemedi.');
    }
  }, [player, status.duration, status.isLoaded, ticketExpiresAt]);

  const changeRate = useCallback(() => {
    const next = getNextPlaybackRate(playbackRate);
    playbackRateRef.current = next;
    setPlaybackRate(next);
    player.setPlaybackRate(next);
  }, [playbackRate, player]);

  const retry = useCallback(async () => {
    if (!session) return;
    await loadTrackForSession(session, selectedIndex);
  }, [loadTrackForSession, selectedIndex, session]);

  const value = useMemo<NativeAudioPlayback>(() => ({
    session,
    selectedIndex,
    selectedTrack,
    ticketExpiresAt,
    loadingTicket,
    error,
    playbackRate,
    currentTime,
    duration,
    playing: status.playing,
    buffering: status.isBuffering,
    loaded: status.isLoaded,
    busy: !error && (loadingTicket || (hasSource && (status.isBuffering || !status.isLoaded))),
    canControl,
    openSession,
    loadTrack,
    togglePlayback,
    seekTo,
    changeRate,
    retry,
    close: clearSession,
  }), [
    canControl,
    clearSession,
    currentTime,
    duration,
    error,
    hasSource,
    loadTrack,
    loadingTicket,
    openSession,
    playbackRate,
    retry,
    seekTo,
    selectedIndex,
    selectedTrack,
    session,
    status.isBuffering,
    status.isLoaded,
    status.playing,
    ticketExpiresAt,
    togglePlayback,
  ]);

  return <AudioPlaybackContext.Provider value={value}>{children}</AudioPlaybackContext.Provider>;
}

export function useAudioPlayback(): NativeAudioPlayback {
  const playback = useContext(AudioPlaybackContext);
  if (!playback) throw new Error('AudioPlaybackProvider is required.');
  return playback;
}
