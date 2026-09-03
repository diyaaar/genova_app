// NATIVE sürüm. Skia native tarafta hazır gelir, yüklenecek bir şey yok.
// Metro bu dosyayı iOS/Android'de, skiaBoot.web.ts'i web'de seçer —
// böylece canvaskit-wasm (ve onun istediği Node 'fs' modülü) native pakete HİÇ girmez.
export async function bootSkia(): Promise<void> {
  (globalThis as any).__SKIA_READY__ = true;
}
