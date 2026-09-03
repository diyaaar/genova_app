#!/usr/bin/env bash
# Genova repertuvar spike — tek komutluk kurulum.
#   cd spike/repertuvar && bash setup.sh
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"

echo "── 1/5  Flutter kontrolü"
if ! command -v flutter >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "   Flutter yok, Homebrew ile kuruluyor (birkaç dakika)…"
    brew install --cask flutter
  else
    echo "   ✗ Ne Flutter ne Homebrew var."
    echo "     Önce Homebrew kur:  https://brew.sh"
    echo "     Sonra bu betiği tekrar çalıştır."
    exit 1
  fi
fi
flutter --version | head -1

echo "── 2/5  Proje iskeleti"
# flutter create mevcut lib/ dosyalarını silmez, sadece kendi main.dart'ını yazar.
if [ -f lib/main.dart ] && [ ! -f lib/spike_main.dart ]; then
  echo "   proje zaten kurulu, lib/main.dart korunuyor"
else
  flutter create . --project-name genova_spike --platforms=ios,android,macos >/dev/null
  [ -f lib/spike_main.dart ] && mv lib/spike_main.dart lib/main.dart
  rm -f test/widget_test.dart
  echo "   lib/main.dart hazır"
fi

echo "── 3/5  Paketler"
flutter pub add pdfrx supabase_flutter >/dev/null
# assets/score.pdf'i pubspec'e ekle (yoksa)
if ! grep -q "assets/" pubspec.yaml; then
  python3 - <<'PY'
import re, pathlib
p = pathlib.Path("pubspec.yaml"); s = p.read_text()
s = re.sub(r"(\n  uses-material-design: true\n)", r"\1  assets:\n    - assets/\n", s, count=1)
p.write_text(s)
PY
  echo "   pubspec.yaml → assets/ eklendi"
fi
flutter pub get >/dev/null

echo "── 4/5  Supabase anahtarları (.env.local'dan)"
URL=$(grep -m1 '^NEXT_PUBLIC_SUPABASE_URL=' "$ROOT/.env.local" | cut -d= -f2-)
KEY=$(grep -m1 '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ROOT/.env.local" | cut -d= -f2-)
cat > run.sh <<RUN
#!/usr/bin/env bash
# Çalıştırmadan önce doldur:
EMAIL="\${SPIKE_EMAIL:-}"          # koro üyesi e-postan
PASSWORD="\${SPIKE_PASSWORD:-}"    # şifren  (örn: SPIKE_PASSWORD=... bash run.sh)
FILE_ID="\${SPIKE_FILE_ID:-}"      # repertoire_files.id — anotasyonu olan bir dosya

exec flutter run "\$@" \\
  --dart-define=SUPABASE_URL=$URL \\
  --dart-define=SUPABASE_ANON_KEY=$KEY \\
  --dart-define=SPIKE_EMAIL="\$EMAIL" \\
  --dart-define=SPIKE_PASSWORD="\$PASSWORD" \\
  --dart-define=SPIKE_FILE_ID="\$FILE_ID"
RUN
chmod +x run.sh
echo "   run.sh yazıldı (anahtarlar gömülü, git'e girmez)"
grep -q '^spike/repertuvar/run.sh$' "$ROOT/.gitignore" || echo 'spike/repertuvar/run.sh' >> "$ROOT/.gitignore"

echo "── 5/5  Analiz"
flutter analyze || true

cat <<'DONE'

Kurulum bitti. Sırada:
  1) assets/score.pdf  → anotasyonu olan bir partisyonu buraya kopyala
  2) SPIKE_FILE_ID     → o dosyanın repertoire_files.id'si
  3) çalıştır:
       SPIKE_EMAIL=... SPIKE_PASSWORD=... SPIKE_FILE_ID=... bash run.sh -d macos
     gerçek cihazda (basınç testi için):
       flutter devices          # iPad'i USB ile bağla, "Trust" de
       SPIKE_... bash run.sh -d <cihaz-id> --release

flutter analyze uyarı verdiyse önce onları düzelt — pdfrx API imzaları
sürüme göre değişmiş olabilir, dosyada uyarı olarak işaretli.
DONE
