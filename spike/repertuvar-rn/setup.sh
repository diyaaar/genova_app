#!/usr/bin/env bash
# Genova RN spike — kurulum.  cd spike/repertuvar-rn && bash setup.sh
# create-expo-app sihirbazi KULLANILMIYOR; proje dosyalari zaten yazili.
set -euo pipefail
cd "$(dirname "$0")"
export npm_config_strict_peer_dependencies=
export npm_config_store_dir=

echo "── 1/3  Expo kuruluyor (birkac dakika surebilir)"
npm install --no-audit --no-fund expo@latest

echo "── 2/3  Bagimliliklar (surumleri expo secsin)"
npx expo install react react-dom react-native react-native-web @expo/metro-runtime \
  @shopify/react-native-skia typescript @types/react

echo "── 3/3  Tip kontrolu"
npx tsc --noEmit || echo "   (tsc uyarilari yukarida — hepsini bana yapistir)"

cat <<'DONE'

Kurulum bitti. Calistir:
    npx expo start --web
  (tarayicida acilir; iOS simulator icin  npx expo start  sonra  i )

ADIM A'da gormen gerekenler — sayfa 1, izgara etiketleriyle dogrula:
  kirmizi kalem     (0.10,0.10) -> (0.90,0.90), ortadan gecer, YUMUSAK
  sari fosforlu     y=0.30 boyunca yatay, kalin, yari saydam
  siyah ok          (0.20,0.70) -> (0.80,0.70), ucu sagda
  yesil dikdortgen  sol ust (0.25,0.40), sag alt (0.75,0.60)
  mavi metin kutusu sol ust kosesi (0.10,0.84)

Ust barda "1 bilinmeyen tip atlandi" yazmali, uygulama cokmemeli.
Sayfa 2 ayni cizimlerin SOLUK hali. Sayfa 40'ta mavi cerceve + SON SAYFA.
DONE
