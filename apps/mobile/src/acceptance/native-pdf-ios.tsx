import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerRootComponent } from 'expo';
import { File } from 'expo-file-system';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  parseAnnotationSchemaPayload,
  type AnnotationLayerKey,
} from '@shared/repertuvar/annotation-types';
import { AnnotationOverlay } from '../repertoire/AnnotationOverlay';
import { nativePdfRenderer } from '../repertoire/pdf-renderer';
import { toNativePdfPageIndex, type NativeAnnotationReadResult, type NativePageImage } from '../repertoire/reader-contract';

const EXPECTED_PAGE_COUNT = 40;
const EVIDENCE_PAGES = [1, 20, 40] as const;
const PDF_ASSET = require('../repertoire/__fixtures__/score_40p.pdf') as number;
const ANNOTATION_FIXTURE = require('../repertoire/__fixtures__/annotations.sample.json') as unknown;

type FixtureRow = {
  page_number: number;
  layer_type: 'personal' | 'shared_all';
  annotations_json: unknown;
};

type Status = 'opening' | 'rendering' | 'ready' | 'closed' | 'error';

function buildAnnotations(value: unknown): NativeAnnotationReadResult {
  if (!Array.isArray(value)) throw new Error('Sentetik anotasyon fikstürü geçersiz.');
  const byPage: NativeAnnotationReadResult['byPage'] = {};
  let skippedCount = 0;
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') {
      skippedCount += 1;
      continue;
    }
    const row = candidate as Partial<FixtureRow>;
    if (
      !Number.isInteger(row.page_number) ||
      (row.layer_type !== 'personal' && row.layer_type !== 'shared_all')
    ) {
      skippedCount += 1;
      continue;
    }
    const parsed = parseAnnotationSchemaPayload(row.annotations_json, 1);
    skippedCount += parsed.skippedCount;
    const page = row.page_number as number;
    const layers = byPage[page] ?? [];
    layers.push({ layerKey: row.layer_type as AnnotationLayerKey, items: parsed.items });
    byPage[page] = layers;
  }
  return { byPage, skippedCount };
}

function imageExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export function NativePdfIosAcceptanceApp() {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const annotations = useMemo(() => buildAnnotations(ANNOTATION_FIXTURE), []);
  const pdfUri = useMemo(() => Image.resolveAssetSource(PDF_ASSET)?.uri ?? '', []);
  const [status, setStatus] = useState<Status>('opening');
  const [page, setPage] = useState<(typeof EVIDENCE_PAGES)[number]>(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [image, setImage] = useState<NativePageImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [invalidPageResult, setInvalidPageResult] = useState('NOT RUN');
  const [cleanupResult, setCleanupResult] = useState('NOT RUN');
  const operation = useRef(0);
  const opened = useRef(false);

  const renderPage = useCallback(async (
    requestedPage: (typeof EVIDENCE_PAGES)[number],
    shouldOpen: boolean,
  ) => {
    const version = ++operation.current;
    setStatus(shouldOpen ? 'opening' : 'rendering');
    setError(null);
    try {
      if (!pdfUri) throw new Error('Sentetik PDF asset URI bulunamadı.');
      if (shouldOpen) {
        const info = await nativePdfRenderer.open(pdfUri);
        if (info.pageCount !== EXPECTED_PAGE_COUNT) {
          throw new Error(`Beklenen 40 sayfa yerine ${info.pageCount} sayfa açıldı.`);
        }
        opened.current = true;
        setPageCount(info.pageCount);
      }
      const nextImage = await nativePdfRenderer.generate(pdfUri, toNativePdfPageIndex(requestedPage));
      if (version !== operation.current) return;
      if (!nextImage.uri || nextImage.width <= 0 || nextImage.height <= 0 || !imageExists(nextImage.uri)) {
        throw new Error('Native PDF çıktısı boş veya okunamıyor.');
      }
      setPage(requestedPage);
      setImage(nextImage);
      setStatus('ready');
    } catch (nextError) {
      if (version !== operation.current) return;
      setError(nextError instanceof Error ? nextError.message : 'Native PDF oluşturulamadı.');
      setStatus('error');
    }
  }, [pdfUri]);

  useEffect(() => {
    void renderPage(1, true);
    return () => {
      operation.current += 1;
      if (opened.current && pdfUri) void nativePdfRenderer.close(pdfUri);
      opened.current = false;
    };
  }, [pdfUri, renderPage]);

  const selectPage = (requestedPage: (typeof EVIDENCE_PAGES)[number]) => {
    if (!opened.current || status === 'closed') {
      void renderPage(requestedPage, true);
      return;
    }
    void renderPage(requestedPage, false);
  };

  const verifyInvalidPage = async () => {
    if (!pdfUri || !opened.current) return;
    setInvalidPageResult('RUNNING');
    try {
      await nativePdfRenderer.generate(pdfUri, EXPECTED_PAGE_COUNT);
      setInvalidPageResult('FAIL: page 41 rendered');
    } catch {
      setInvalidPageResult('PASS: page 41 refused');
    }
  };

  const closeAndVerify = async () => {
    if (!pdfUri || !opened.current) return;
    const outputUri = image?.uri ?? '';
    operation.current += 1;
    await nativePdfRenderer.close(pdfUri);
    opened.current = false;
    const retained = outputUri ? imageExists(outputUri) : false;
    setCleanupResult(retained ? 'FAIL: rendered file remains' : 'PASS: rendered file deleted');
    setImage(null);
    setStatus('closed');
  };

  const pageRatio = image ? image.height / image.width : 1.414;
  const fittedWidth = Math.min(viewportWidth - 24, Math.max(1, (viewportHeight - 260) / pageRatio));
  const pageWidth = fittedWidth * zoom;
  const pageHeight = pageWidth * pageRatio;
  const pageAnnotations = annotations.byPage[page] ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SYNTHETIC · iOS NATIVE ACCEPTANCE</Text>
        <Text style={styles.title}>PDF + Skia gerçek çıktı</Text>
        <Text style={styles.diagnostics} testID="native-pdf-diagnostics">
          page={page}/{pageCount ?? '—'} · image={image ? `${image.width}×${image.height}` : '—'} · zoom={Math.round(zoom * 100)}% · skipped={annotations.skippedCount}
        </Text>
      </View>

      <View style={styles.pageControls}>
        {EVIDENCE_PAGES.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            disabled={status === 'opening' || status === 'rendering'}
            onPress={() => selectPage(value)}
            style={[styles.button, page === value && styles.buttonActive]}
            testID={`native-pdf-page-${value}`}
          >
            <Text style={styles.buttonText}>{value}</Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={() => setZoom((value) => value === 1 ? 1.5 : 1)} style={styles.button}>
          <Text style={styles.buttonText}>{zoom === 1 ? '150%' : '100%'}</Text>
        </Pressable>
      </View>

      {status === 'opening' || status === 'rendering' ? (
        <View style={styles.center}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.muted}>{status === 'opening' ? 'Native PDF açılıyor…' : `${page}. sayfa üretiliyor…`}</Text>
        </View>
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void renderPage(page, true)} style={styles.button}>
            <Text style={styles.buttonText}>Yeniden aç</Text>
          </Pressable>
        </View>
      ) : status === 'closed' ? (
        <View style={styles.center}>
          <Text style={styles.pass}>{cleanupResult}</Text>
          <Pressable accessibilityRole="button" onPress={() => void renderPage(page, true)} style={styles.button}>
            <Text style={styles.buttonText}>Yeniden aç</Text>
          </Pressable>
        </View>
      ) : image ? (
        <ScrollView style={styles.viewport} contentContainerStyle={styles.verticalContent}>
          <ScrollView horizontal contentContainerStyle={styles.horizontalContent}>
            <View style={[styles.page, { width: pageWidth, height: pageHeight }]}>
              <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} resizeMode="stretch" />
              <AnnotationOverlay layers={pageAnnotations} width={pageWidth} height={pageHeight} />
            </View>
          </ScrollView>
        </ScrollView>
      ) : null}

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" disabled={!opened.current} onPress={() => void verifyInvalidPage()} style={styles.footerButton}>
          <Text style={styles.footerText}>41. sayfayı reddet</Text>
        </Pressable>
        <Text style={invalidPageResult.startsWith('PASS') ? styles.pass : styles.muted}>{invalidPageResult}</Text>
        <Pressable accessibilityRole="button" disabled={!opened.current} onPress={() => void closeAndVerify()} style={styles.footerButton}>
          <Text style={styles.footerText}>Kapat + temizle</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#07111f' },
  header: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  eyebrow: { color: '#38bdf8', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginTop: 2 },
  diagnostics: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  pageControls: { flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingBottom: 7 },
  button: { minWidth: 44, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#172033', paddingHorizontal: 11, paddingVertical: 7, alignItems: 'center' },
  buttonActive: { borderColor: '#38bdf8', backgroundColor: '#0c4a6e' },
  buttonText: { color: '#f8fafc', fontSize: 12, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { color: '#94a3b8', fontSize: 11, textAlign: 'center' },
  error: { color: '#f87171', textAlign: 'center' },
  pass: { color: '#4ade80', fontSize: 11, textAlign: 'center' },
  viewport: { flex: 1, width: '100%' },
  verticalContent: { flexGrow: 1, justifyContent: 'center' },
  horizontalContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
  page: { backgroundColor: '#ffffff', overflow: 'hidden', shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 8 },
  footer: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderTopWidth: 1, borderTopColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 7 },
  footerButton: { borderRadius: 7, backgroundColor: '#172033', paddingHorizontal: 9, paddingVertical: 7 },
  footerText: { color: '#cbd5e1', fontSize: 10, fontWeight: '700' },
});

registerRootComponent(NativePdfIosAcceptanceApp);
