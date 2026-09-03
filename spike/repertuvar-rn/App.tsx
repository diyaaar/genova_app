// Genova repertuvar spike — React Native.
//
// ADIM A (bu dosya): arka plan koordinat ızgarası PNG'si. PDF kütüphanesi YOK.
//   Amaç: çizim matematiği, tension eğrisi, renkler, katman opaklığı ve bilinmeyen
//   tip davranışı Skia'da doğru mu — PDF riskinden bağımsız olarak.
// ADIM B: aşağıdaki <GridPage> yerine seçilen PDF görüntüleyici konur, gerisi aynı kalır.
//
// 001'in 1. dersi: SESSİZ HATA YASAK. Teşhis satırı en başta, her zaman görünür.

import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  useWindowDimensions, PanResponder, SafeAreaView,
} from 'react-native';
import { AnnotationLayer, parseAnnotations } from './src/AnnotationLayer';
import type { LayerRow, AnnotationItem } from './src/model';
import { renderPages, pdfModuleAvailable, type PageImage } from './src/pdfPage';

import sample from './assets/annotations.sample.json';

const PAGE_RATIO = 842 / 595; // A4

/** index.js Skia'yı web'de yüklerken bu bayrakları set ediyor. */
function skiaState(): string {
  const g = globalThis as any;
  if (g.__SKIA_ERROR__) return `HATA ${g.__SKIA_ERROR__}`;
  return g.__SKIA_READY__ ? 'hazır' : 'yüklenmedi';
}

/** 001'in 1. dersi: sessiz hata yasak. Katman patlarsa sebebini ekranda göster. */
class Guard extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: any) { return { err: String(e?.message ?? e) }; }
  render() {
    if (this.state.err) {
      return (
        <View style={{ padding: 16, backgroundColor: '#fee2e2' }}>
          <Text style={{ color: '#991b1b', fontSize: 12 }}>ÇİZİM HATASI: {this.state.err}</Text>
        </View>
      );
    }
    return this.props.children as any;
  }
}

export default function App() {
  const { width: winW } = useWindowDimensions();
  const pageW = Math.min(winW - 24, 900); // kenarlarda nefes payi
  const pageH = pageW * PAGE_RATIO;

  // ADIM B: PDF sayfa görüntüleri. Başarısız olursa ADIM A'ya (ızgara PNG) düşer.
  const [pdfPages, setPdfPages] = useState<Record<number, PageImage> | null>(null);
  const [pdfNote, setPdfNote] = useState(
    pdfModuleAvailable() ? 'PDF: yükleniyor…' : 'PDF: modül yok → ızgara PNG (ADIM A)',
  );

  React.useEffect(() => {
    if (!pdfModuleAvailable()) return;
    renderPages([1, 2, 40])
      .then(({ pageCount, images }) => {
        setPdfPages(images);
        setPdfNote(`PDF: ${pageCount} sayfa · ${Object.keys(images).length} render edildi`);
      })
      .catch((e) => setPdfNote(`PDF HATASI: ${String(e?.message ?? e)} → ızgara PNG`));
  }, []);

  const [live, setLive] = useState<{ x: number; y: number }[]>([]);
  const [touch, setTouch] = useState('kind: —  force: 0.000');
  const liveRef = useRef<{ x: number; y: number }[]>([]);

  const { layers, diag } = useMemo(() => {
    try {
      const rows = sample as unknown as LayerRow[];
      const byPage = new Map<number, { items: AnnotationItem[]; active: boolean }[]>();
      let total = 0, skipped = 0;
      for (const r of rows) {
        const items = parseAnnotations(r.annotations_json);
        skipped += r.annotations_json.length - items.length;
        total += items.length;
        const arr = byPage.get(r.page_number) ?? [];
        arr.push({ items, active: r.layer_type === 'personal' });
        byPage.set(r.page_number, arr);
      }
      return {
        layers: byPage,
        diag: `${rows.length} katman · ${total} öğe · ${skipped} bilinmeyen tip atlandı`,
      };
    } catch (e) {
      return { layers: new Map(), diag: `VERİ HATASI: ${String(e)}` };
    }
  }, []);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e) => {
        const n = e.nativeEvent as any;
        setTouch(`kind: ${n.touches?.length ? 'touch' : 'pointer'}  force: ${(n.force ?? 0).toFixed(3)}`);
        liveRef.current = [
          ...liveRef.current,
          { x: n.locationX / pageW, y: n.locationY / pageH },
        ];
        setLive(liveRef.current);
      },
      onPanResponderRelease: () => { liveRef.current = []; setLive([]); },
    }),
  ).current;

  const liveItems: AnnotationItem[] = live.length > 1
    ? ([{ id: 'live', type: 'pen', color: 'red', strokeWidth: 3 / pageW, points: live }] as any)
    : [];

  return (
    <SafeAreaView style={s.root}>
      <View style={s.bar}>
        <Text style={s.h}>ÖRNEK VERİ · {diag}</Text>
        <Text style={s.sub}>{touch}</Text>
        <Text style={s.sub}>{pdfNote} · Skia: {skiaState()}</Text>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 }}>
        {[1, 2, 40].map((pageNo) => (
          <View key={pageNo} style={{ width: pageW, height: pageH, marginBottom: 16 }}>
            {/* ADIM B'de burası PDF görüntüleyici olacak */}
            <PageBackground w={pageW} h={pageH} img={pdfPages?.[pageNo]} />
            <Guard>
              {(layers.get(pageNo) ?? []).map((l, i) => (
                <AnnotationLayer
                  key={i}
                  items={l.items}
                  isActiveLayer={l.active}
                  width={pageW}
                  height={pageH}
                />
              ))}
            </Guard>
            {pageNo === 1 && (
              <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
                <AnnotationLayer items={liveItems} isActiveLayer width={pageW} height={pageH} />
              </View>
            )}
            <Text style={s.pageNo}>sayfa {pageNo}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/** PDF görüntüsü varsa onu, yoksa ızgara PNG'sini gösterir (ADIM A'ya düşüş). */
function PageBackground({ w, h, img }: { w: number; h: number; img?: PageImage }) {
  if (img) {
    return (
      <Image
        source={{ uri: img.uri }}
        style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}
        resizeMode="stretch"
      />
    );
  }
  return <GridPage w={w} h={h} />;
}

function GridPage({ w, h }: { w: number; h: number }) {
  // Ölçüler AÇIKÇA veriliyor: react-native-web'de absoluteFill tek başına
  // görseli kutuya sığdırmıyor, doğal boyutunda (794x1123) açıyor ve
  // çizim katmanıyla hizası kayıyor.
  return (
    <Image
      source={require('./assets/grid-page1.png')}
      style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}
      resizeMode="stretch"
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  bar: { padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e4e7' },
  h: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  sub: { fontSize: 11, color: '#71717a', textAlign: 'center', marginTop: 2 },
  pageNo: { position: 'absolute', right: 6, bottom: 4, fontSize: 10, color: '#a1a1aa' },
});
