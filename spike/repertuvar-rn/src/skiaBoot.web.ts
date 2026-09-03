// WEB sürümü. Skia burada CanvasKit (WASM) olarak çalışır ve herhangi bir
// Skia API'si kullanılmadan ÖNCE yüklenmelidir. canvaskit.wasm public/ altında.
export async function bootSkia(): Promise<void> {
  try {
    const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/commonjs/web');
    await LoadSkiaWeb({ locateFile: (file: string) => `/${file}` });
    (globalThis as any).__SKIA_READY__ = true;
  } catch (e) {
    (globalThis as any).__SKIA_ERROR__ = String(e);
  }
}
