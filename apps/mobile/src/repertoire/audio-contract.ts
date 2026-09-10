import type { RepertoireFile } from '@shared/repertuvar/catalog-core';

const NATIVE_AUDIO_EXTENSIONS = new Set(['mp3', 'wav']);
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export interface NativeAudioTrack {
  file: RepertoireFile;
  label: string;
  supported: boolean;
}

export interface NativeAudioSession {
  songId: string;
  songTitle: string;
  tracks: NativeAudioTrack[];
}

function extensionOf(fileName: string) {
  const finalDot = fileName.lastIndexOf('.');
  return finalDot > 0 ? fileName.slice(finalDot + 1).toLocaleLowerCase('en-US') : '';
}

export function getNativeAudioTracks(files: RepertoireFile[] | undefined): NativeAudioTrack[] {
  return (files ?? [])
    .filter((file) => file.file_type === 'audio')
    .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id))
    .map((file) => ({
      file,
      label: file.partition_label?.trim() || file.file_name.replace(/\.[^.]+$/u, ''),
      supported: NATIVE_AUDIO_EXTENSIONS.has(extensionOf(file.file_name)),
    }));
}

export function clampAudioPosition(seconds: number, duration: number) {
  if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(Math.max(seconds, 0), duration);
}

export function formatAudioTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export function getNextPlaybackRate(current: number) {
  const index = PLAYBACK_RATES.findIndex((rate) => rate > current + 0.001);
  return (index === -1 ? PLAYBACK_RATES[0] : PLAYBACK_RATES[index]) ?? 1;
}

export function shouldRefreshAudioTicket(expiresAt: number | null, now = Date.now()) {
  return expiresAt === null || expiresAt <= now + 5_000;
}
