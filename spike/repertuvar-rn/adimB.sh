#!/usr/bin/env bash
# ADIM B — PDF sayfasini goruntuye cevirip ayni katmanin altina koy.
# Native modul gerektirir: tarayicida DEGIL, iOS simulatorunde calisir.
set -euo pipefail
cd "$(dirname "$0")"
export npm_config_strict_peer_dependencies=
export npm_config_store_dir=

echo "── 1/3  Modul kurulumu"
npm uninstall react-native-pdf-page-image 2>/dev/null || true
npm install --no-audit --no-fund @dariyd/react-native-pdf-page-image
# Skia native tarafta reanimated'i ZORUNLU istiyor (web'de istemiyor).
# gesture-handler'i da simdiden ekliyoruz: zoom/kaydirma kabi onunla yazilacak.
npx expo install expo-asset react-native-reanimated react-native-gesture-handler

echo "── 2/3  Tip kontrolu"
npx tsc --noEmit || echo "   (uyarilar yukarida)"

echo "── 3/3  iOS derlemesi (yeni native modul eklendi, pod install yeniden calisacak)"
echo "   (Xcode projesi olusturulup simulatorde acilacak; cihaz/Apple hesabi GEREKMEZ)"
npx expo run:ios
