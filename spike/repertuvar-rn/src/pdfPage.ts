// PDF sayfasini bitmap'e cevirir. Hazir goruntuleyici KULLANMIYORUZ —
// RN'de hicbiri sayfa ustune katman koymaya izin vermiyor (bkz. KARARLAR.md #13).
// Sayfa = goruntu + ustunde Skia katmani. Adim A'nin mimarisinin aynisi.
import { Asset } from 'expo-asset';

export type PageImage = { uri: string; width: number; height: number };

let PdfPageImage: any = null;
try {
  // Native modul; Expo Go'da YOK, development build gerekir.
  // DIKKAT: bakimli fork bu — eski `react-native-pdf-page-image` (2024) terk edilmis
  // ve modern RN'de RCT-Folly hatasi veriyor. Adlandirilmis export kullaniyor.
  PdfPageImage = require('@dariyd/react-native-pdf-page-image').PdfPageImage;
} catch {
  PdfPageImage = null;
}

export const pdfModuleAvailable = () => PdfPageImage != null;

/** Paketlenmis PDF'i yerel dosya URI'sine cevirir. */
async function resolveBundledPdf(): Promise<string> {
  const asset = Asset.fromModule(require('../assets/score_40p.pdf'));
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error('PDF varligi yerel dosyaya cozulemedi');
  return asset.localUri;
}

/** Istenen sayfalarin goruntulerini uretir. Hata ATILIR — cagiran taraf gosterir. */
export async function renderPages(pages: number[], scale = 2): Promise<{
  pageCount: number;
  images: Record<number, PageImage>;
}> {
  if (!PdfPageImage) {
    throw new Error(
      '@dariyd/react-native-pdf-page-image yuklu degil ya da Expo Go ile calisiyorsun. ' +
      'Development build gerekli: npx expo run:ios',
    );
  }
  const uri = await resolveBundledPdf();
  const info = await PdfPageImage.open(uri);
  const images: Record<number, PageImage> = {};
  for (const p of pages) {
    if (p > info.pageCount) continue;
    // Kutuphane sayfalari 0'dan sayiyor; bizim kayitlarimiz 1'den.
    images[p] = await PdfPageImage.generate(uri, p - 1, scale);
  }
  await PdfPageImage.close(uri);
  return { pageCount: info.pageCount, images };
}
