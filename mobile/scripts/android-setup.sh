
#!/bin/sh
set -eu

DEVICE="android-emulator:5555"
PACKAGE="com.muvinai.carnet2"
APK_DIR="${SPORTCLUB_APK_DIR:-/work/apks/sportclub/x86_64}"

echo "[1/3] Esperando a Android..."

attempt=0

while true; do
  adb connect "$DEVICE" >/dev/null 2>&1 || true

  boot_completed="$(
    adb -s "$DEVICE" shell getprop sys.boot_completed \
      2>/dev/null | tr -d '\r' || true
  )"

  if [ "$boot_completed" = "1" ]; then
    break
  fi

  attempt=$((attempt + 1))

  if [ "$attempt" -ge 90 ]; then
    echo "ERROR: Android no terminó de iniciar"
    exit 1
  fi

  sleep 3
done

echo "[2/3] Verificando SportClub..."

if adb -s "$DEVICE" shell pm path "$PACKAGE" \
  2>/dev/null | grep -q '^package:'; then
  echo "SportClub ya está instalada"
  exit 0
fi

echo "Instalando SportClub..."

for file in \
  base.apk \
  split_config.en.apk \
  split_config.x86_64.apk \
  split_config.xxhdpi.apk
do
  if [ ! -s "$APK_DIR/$file" ]; then
    echo "ERROR: Falta $APK_DIR/$file"
    exit 1
  fi
done

adb -s "$DEVICE" install-multiple \
  "$APK_DIR/base.apk" \
  "$APK_DIR/split_config.en.apk" \
  "$APK_DIR/split_config.x86_64.apk" \
  "$APK_DIR/split_config.xxhdpi.apk"

echo "[3/3] Verificando instalación..."

adb -s "$DEVICE" shell pm path "$PACKAGE" \
  | grep -q '^package:' || {
    echo "ERROR: SportClub no quedó instalada"
    exit 1
  }

echo "SportClub instalada correctamente"
