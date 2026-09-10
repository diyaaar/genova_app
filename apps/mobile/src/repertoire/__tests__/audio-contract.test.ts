import type { RepertoireFile } from '@shared/repertuvar/catalog-core';
import {
  clampAudioPosition,
  formatAudioTime,
  getNativeAudioTracks,
  getNextPlaybackRate,
  shouldRefreshAudioTicket,
} from '../audio-contract';

function file(overrides: Partial<RepertoireFile> = {}): RepertoireFile {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    song_id: 'song-a',
    file_name: 'track.mp3',
    file_type: 'audio',
    partition_label: '',
    drive_file_id: 'provider-id',
    drive_web_view_link: null,
    drive_download_link: null,
    mime_type: 'audio/mpeg',
    file_size_bytes: 1_000,
    uploaded_by: null,
    created_at: '2026-09-10T10:00:00Z',
    updated_at: '2026-09-10T10:00:00Z',
    ...overrides,
  };
}

describe('native audio contract', () => {
  it('filters audio, orders like web, labels tracks and marks unsupported formats', () => {
    const tracks = getNativeAudioTracks([
      file({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', file_name: 'score.pdf', file_type: 'sheet' }),
      file({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', file_name: 'old.wav', created_at: '2026-09-09T10:00:00Z' }),
      file({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', file_name: 'same.ogg', partition_label: '  Tenor  ' }),
      file({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', file_name: 'new.mp3', created_at: '2026-09-11T10:00:00Z' }),
    ]);

    expect(tracks.map(({ file: item, label, supported }) => [item.id, label, supported])).toEqual([
      ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'old', true],
      ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Tenor', false],
      ['dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'new', true],
    ]);
  });

  it('bounds seek, formats time, cycles speeds and renews near expiry', () => {
    expect(clampAudioPosition(-3, 90)).toBe(0);
    expect(clampAudioPosition(120, 90)).toBe(90);
    expect(clampAudioPosition(45, 90)).toBe(45);
    expect(clampAudioPosition(Number.NaN, 90)).toBe(0);
    expect(formatAudioTime(65.9)).toBe('1:05');
    expect(getNextPlaybackRate(1)).toBe(1.25);
    expect(getNextPlaybackRate(2)).toBe(0.5);
    expect(shouldRefreshAudioTicket(16_000, 10_000)).toBe(false);
    expect(shouldRefreshAudioTicket(15_000, 10_000)).toBe(true);
    expect(shouldRefreshAudioTicket(null, 10_000)).toBe(true);
  });
});
