import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { filterRepertoireCatalogSongs } from '@shared/repertuvar/catalog-core';
import { theme } from '../ui/theme';
import { getNativeAudioTracks, type NativeAudioSession } from './audio-contract';
import type { NativeRepertoireCatalog, NativeRepertoireGateway } from './catalog-gateway';
import { registerRepertoireGatewayCache } from './cache-registration';
import { getDefaultRepertoireGateway } from './default-gateway';
import { getScorePdfFiles, type NativeScoreReaderGateway } from './reader-contract';
import { ScoreReaderScreen } from './ScoreReaderScreen';

interface RepertoireScreenProps {
  choirId: string;
  memberId: string;
  choirName: string;
  gateway?: NativeRepertoireGateway;
  readerGateway?: NativeScoreReaderGateway;
  onOpenAudio: (session: NativeAudioSession) => void;
  canSwitchChoir: boolean;
  onBack: () => void;
  onSwitchChoir: () => void;
  onSignOut: () => void;
}

export function RepertoireScreen({
  choirId,
  memberId,
  choirName,
  gateway: suppliedGateway,
  readerGateway,
  onOpenAudio,
  canSwitchChoir,
  onBack,
  onSwitchChoir,
  onSignOut,
}: RepertoireScreenProps) {
  const gateway = useMemo(
    () => suppliedGateway ?? getDefaultRepertoireGateway(),
    [suppliedGateway],
  );
  const [catalogue, setCatalogue] = useState<NativeRepertoireCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<import('@shared/repertuvar/catalog-core').RepertoireFile | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async (force: boolean) => {
    const version = ++requestVersion.current;
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const next = await gateway.load({ choirId, memberId, force });
      if (requestVersion.current !== version) return;
      setCatalogue(next);
    } catch (loadError) {
      if (requestVersion.current !== version) return;
      setCatalogue(null);
      setError(loadError instanceof Error ? loadError.message : 'Repertuvar yüklenemedi.');
    } finally {
      if (requestVersion.current !== version) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [choirId, gateway, memberId]);

  useEffect(() => {
    // The process-wide default registers when it is created. An injected gateway is owned by
    // the caller/test and only needs to remain registered for this mounted screen.
    const unregister = suppliedGateway ? registerRepertoireGatewayCache(gateway) : () => {};
    void load(false);
    return () => {
      requestVersion.current += 1;
      unregister();
    };
  }, [gateway, load]);

  const accessibleSongs = useMemo(() => catalogue
    ? filterRepertoireCatalogSongs({
      songs: catalogue.songs,
      assignedSongIds: catalogue.assignedSongIds,
      roleScope: catalogue.roleScope,
    })
    : [], [catalogue]);

  const tagNames = useMemo(() => Array.from(new Set(
    accessibleSongs.flatMap((song) => (song.tags ?? []).map((tag) => tag.name)),
  )).sort((a, b) => a.localeCompare(b, 'tr')), [accessibleSongs]);

  useEffect(() => {
    if (activeTag && !tagNames.includes(activeTag)) setActiveTag(null);
  }, [activeTag, tagNames]);

  const songs = useMemo(() => catalogue
    ? filterRepertoireCatalogSongs({
      songs: catalogue.songs,
      assignedSongIds: catalogue.assignedSongIds,
      roleScope: catalogue.roleScope,
      search,
      tag: activeTag,
    })
    : [], [activeTag, catalogue, search]);

  if (selectedFile) {
    return (
      <ScoreReaderScreen
        choirId={choirId}
        file={selectedFile}
        gateway={readerGateway}
        onBack={() => setSelectedFile(null)}
      />
    );
  }

  return (
    <View style={styles.container} testID="repertoire-screen">
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" testID="repertoire-back">
          <Text style={styles.action}>Geri</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>{choirName}</Text>
          <Text style={styles.title}>Repertuvar</Text>
        </View>
        <Pressable
          onPress={() => void load(true)}
          disabled={refreshing}
          accessibilityRole="button"
          testID="repertoire-refresh"
        >
          <Text style={styles.action}>{refreshing ? 'Yenileniyor' : 'Yenile'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center} testID="repertoire-loading">
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.muted}>Repertuvar yükleniyor…</Text>
        </View>
      ) : error ? (
        <View style={styles.center} testID="repertoire-error">
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void load(true)} accessibilityRole="button" testID="repertoire-retry">
            <Text style={styles.action}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Şarkı, besteci veya etiket ara"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.search}
            accessibilityLabel="Repertuvarda ara"
            testID="repertoire-search"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tags}>
            <Pressable onPress={() => setActiveTag(null)} testID="repertoire-tag-all">
              <Text style={[styles.tag, activeTag === null && styles.tagActive]}>Tümü</Text>
            </Pressable>
            {tagNames.map((tag) => (
              <Pressable key={tag} onPress={() => setActiveTag(tag)} testID={`repertoire-tag-${tag}`}>
                <Text style={[styles.tag, activeTag === tag && styles.tagActive]}>{tag}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {accessibleSongs.length === 0 ? (
            <View style={styles.center} testID="repertoire-empty">
              <Text style={styles.muted}>Bu koro için erişilebilir repertuvar bulunamadı.</Text>
            </View>
          ) : songs.length === 0 ? (
            <View style={styles.center} testID="repertoire-no-results">
              <Text style={styles.muted}>Aramanızla eşleşen eser yok.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list} testID="repertoire-list">
              {songs.map((song) => {
                const scoreFiles = getScorePdfFiles(song.files);
                const audioTracks = getNativeAudioTracks(song.files);
                return (
                <View key={song.id} style={styles.card} testID={`repertoire-song-${song.id}`}>
                  <View style={styles.cardText}>
                    <Text style={styles.songTitle}>{song.title}</Text>
                    {song.composer ? <Text style={styles.muted}>{song.composer}</Text> : null}
                    {(song.tags ?? []).length > 0 ? (
                      <Text style={styles.meta}>{(song.tags ?? []).map((tag) => tag.name).join(' · ')}</Text>
                    ) : null}
                  </View>
                  {catalogue?.userParts[song.id] ? (
                    <Text style={styles.part}>{catalogue.userParts[song.id]}</Text>
                  ) : null}
                  <View style={styles.fileActions}>
                    {scoreFiles.length === 0 ? <Text style={styles.noScore}>PDF nota yok</Text> : scoreFiles.map((file) => (
                      <Pressable key={file.id} onPress={() => setSelectedFile(file)} accessibilityRole="button" testID={`repertoire-open-score-${file.id}`}>
                        <Text style={styles.action}>{file.partition_label?.trim() || 'Notayı aç'}</Text>
                      </Pressable>
                    ))}
                    {audioTracks.length > 0 ? (
                      <Pressable
                        onPress={() => onOpenAudio({ songId: song.id, songTitle: song.title, tracks: audioTracks })}
                        accessibilityRole="button"
                        accessibilityLabel={`${song.title} ses kayıtlarını aç`}
                        style={({ pressed }) => [styles.fileButton, pressed && styles.pressed]}
                        testID={`repertoire-open-audio-${song.id}`}
                      >
                        <Text style={styles.action}>{audioTracks.length === 1 ? 'Sesi aç' : `${audioTracks.length} sesi aç`}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );})}
            </ScrollView>
          )}
        </>
      )}

      <View style={styles.footer}>
        {canSwitchChoir ? (
          <Pressable onPress={onSwitchChoir} accessibilityRole="button" testID="repertoire-switch-choir">
            <Text style={styles.action}>Koro değiştir</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onSignOut} accessibilityRole="button" testID="repertoire-sign-out">
          <Text style={styles.action}>Çıkış yap</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing(3), paddingTop: theme.spacing(5), backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing(2) },
  headerText: { flex: 1 },
  kicker: { color: theme.colors.textMuted, fontSize: 12 },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '700' },
  action: { color: theme.colors.accent, fontSize: 14, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(2), padding: theme.spacing(3) },
  muted: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  error: { color: theme.colors.danger, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  search: { marginTop: theme.spacing(3), borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, color: theme.colors.text, paddingHorizontal: theme.spacing(2), paddingVertical: 12 },
  tags: { gap: theme.spacing(1), paddingVertical: theme.spacing(2) },
  tag: { color: theme.colors.textMuted, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  tagActive: { color: theme.colors.text, borderColor: theme.colors.accent },
  list: { gap: theme.spacing(1.5), paddingBottom: theme.spacing(2) },
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2), padding: theme.spacing(2), borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  cardText: { flex: 1, gap: 4 },
  songTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  meta: { color: theme.colors.textMuted, fontSize: 12 },
  part: { color: theme.colors.accent, fontSize: 12, fontWeight: '700' },
  fileActions: { alignItems: 'flex-end', gap: 6 },
  fileButton: { minHeight: 44, minWidth: 48, justifyContent: 'center', alignItems: 'flex-end' },
  pressed: { opacity: 0.7 },
  noScore: { color: theme.colors.textMuted, fontSize: 11 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: theme.spacing(1.5) },
});
