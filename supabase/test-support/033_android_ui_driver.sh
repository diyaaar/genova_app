#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_INPUT="${GENOVA_033_WORKDIR:-}"
EXPECTED_RUNTIME="$REPO_ROOT/spike/033-runtime"
PACKAGE='com.genesinovachoir.genova'

[ "$RUNTIME_INPUT" = "$EXPECTED_RUNTIME" ] || {
  echo 'FAIL 033 Android driver requires the exact owned runtime path' >&2
  exit 1
}
[ "$(adb devices | awk 'NR > 1 && $2 == "device" { count += 1 } END { print count + 0 }')" = 1 ] || {
  echo 'FAIL 033 Android driver requires exactly one ready device' >&2
  exit 1
}
[ "$(adb shell dumpsys activity activities | grep -c "$PACKAGE/.MainActivity")" -gt 0 ] || {
  echo 'FAIL 033 Android Release activity is not running' >&2
  exit 1
}
[ "$(adb reverse --list | grep -c 'tcp:18033 tcp:18033')" = 1 ] || {
  echo 'FAIL 033 web reverse is absent' >&2
  exit 1
}
[ "$(adb reverse --list | grep -c 'tcp:54321 tcp:54321')" = 1 ] || {
  echo 'FAIL 033 service reverse is absent' >&2
  exit 1
}

XML="$EXPECTED_RUNTIME/android-ui-driver.xml"

dump_ui() {
  adb shell uiautomator dump /sdcard/genova-033-ui.xml >/dev/null
  adb pull /sdcard/genova-033-ui.xml "$XML" >/dev/null
}

node_line() {
  local resource_id="$1"
  sed 's/></>\n</g' "$XML" | awk -v id="resource-id=\"$resource_id\"" 'index($0, id) { print; exit }'
}

center_of() {
  local line="$1"
  local bounds
  bounds="$(printf '%s\n' "$line" | sed -E 's/.*bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]".*/\1 \2 \3 \4/')"
  read -r x1 y1 x2 y2 <<<"$bounds"
  printf '%s %s\n' "$(((x1 + x2) / 2))" "$(((y1 + y2) / 2))"
}

scroll_route_bar_forward() {
  local line x1 y1 x2 y2 bounds y width
  line="$(node_line 'runtime-033-routes')"
  [ -n "$line" ] || return 1
  bounds="$(printf '%s\n' "$line" | sed -E 's/.*bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]".*/\1 \2 \3 \4/')"
  read -r x1 y1 x2 y2 <<<"$bounds"
  y="$(((y1 + y2) / 2))"
  width="$((x2 - x1))"
  adb shell input swipe "$((x1 + width * 3 / 4))" "$y" "$((x1 + width / 4))" "$y" 1200 >/dev/null
}

tap_route() {
  local label="$1"
  local family="$2"
  local expected_text="$3"
  local resource_id="runtime-033-route-$label"
  local line point x y

  for _ in 1 2 3 4 5 6; do
    dump_ui
    line="$(node_line "$resource_id")"
    if [ -n "$line" ]; then
      point="$(center_of "$line")"
      read -r x y <<<"$point"
      adb shell input tap "$x" "$y" >/dev/null
      break
    fi
    scroll_route_bar_forward
    sleep 1
  done
  [ -n "${line:-}" ] || {
    echo "FAIL route control unavailable: $family" >&2
    exit 1
  }

  for _ in $(seq 1 25); do
    sleep 1
    dump_ui
    if node_line 'runtime-033-events' | grep -Fq "snapshot running:$family:root" \
      && sed 's/></>\n</g' "$XML" | grep -Fq "$expected_text"; then
      echo "PASS android_route $family"
      return
    fi
    if node_line 'webview-error' | grep -q .; then
      echo "FAIL route entered native error state: $family" >&2
      exit 1
    fi
  done
  echo "FAIL route did not reach running state: $family" >&2
  exit 1
}

dump_ui
node_line 'runtime-033-banner' >/dev/null
sed 's/></>\n</g' "$XML" | grep -Fq '033 · COMPOSED WEBVIEW · RELEASE · android' || {
  echo 'FAIL guarded Android Release banner is absent' >&2
  exit 1
}
tap_route 'Duyurular' 'announcements' '033 Bileşik Duyuru'
tap_route 'Duyuru ayrıntı' 'announcement-detail' 'Yerel bileşik kabul.'
tap_route 'Koristler' 'choristers' '033 Korist Hedef'
tap_route 'Korist ayrıntı' 'chorister-detail' '033 Korist Hedef'
tap_route 'Davetler' 'invitations' 'Henüz davet yok.'
tap_route 'Profil' 'profile' '033 Şef A'
tap_route 'Profil düzenle' 'profile-edit' 'Değişiklik Talebi'
tap_route 'Talepler' 'profile-change-requests' 'Profil Değişiklik Talepleri'
tap_route 'Devamsızlık' 'attendance' '033 Bileşik Prova'

echo 'PASS android_routes count=9 release=true source=accessibility-tree'
