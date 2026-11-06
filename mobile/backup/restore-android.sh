#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE="${1:?Uso: bash mobile/backup/restore-android.sh /ruta/al/respaldo}"
BUNDLE="$(cd "$BUNDLE" && pwd)"
cd "$MOBILE_DIR"
[[ -f "$BUNDLE/images/docker-images.tar.gz" ]] || { echo 'Falta images/docker-images.tar.gz' >&2; exit 1; }
[[ -f "$BUNDLE/metadata/images.env" ]] || { echo 'Falta metadata/images.env' >&2; exit 1; }
[[ -e /dev/kvm ]] || { echo 'ERROR: /dev/kvm no disponible. El emulador necesita Linux + KVM.' >&2; exit 1; }
command -v docker >/dev/null || { echo 'Falta Docker' >&2; exit 1; }
source "$BUNDLE/metadata/images.env"
for svc in android-emulator maestro; do
  if [[ -n "$(docker compose ps -a -q "$svc" 2>/dev/null)" ]]; then
    echo "ERROR: ya hay un contenedor Compose para $svc. Restaurá en una instalación nueva para evitar sobrescritura." >&2
    exit 1
  fi
done

echo '[1/5] Integridad del respaldo'
(cd "$BUNDLE" && sha256sum --check SHA256SUMS)

echo '[2/5] Instalación de claves ADB (solo si no existen)'
mkdir -p "$HOME/.android"
if [[ ! -f "$HOME/.android/adbkey" && -f "$BUNDLE/secrets/adbkey" ]]; then
  install -m 600 "$BUNDLE/secrets/adbkey" "$HOME/.android/adbkey"
  install -m 600 "$BUNDLE/secrets/adbkey.pub" "$HOME/.android/adbkey.pub"
fi
if [[ ! -f "$HOME/.android/adbkey" ]]; then
  echo 'ERROR: falta ~/.android/adbkey. Importá o generá una clave compatible.' >&2
  exit 1
fi
export ADBKEY="$(cat "$HOME/.android/adbkey")"

echo '[3/5] Importación de imágenes Docker'
gzip -dc "$BUNDLE/images/docker-images.tar.gz" | docker image load
cat > "$MOBILE_DIR/docker-compose.snapshot.yml" <<EOF
# Archivo generado automáticamente. No subir al repositorio.
services:
  android-emulator:
    image: ${ANDROID_IMAGE}
  maestro:
    image: ${MAESTRO_IMAGE}
EOF

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.snapshot.yml)
echo '[4/5] Crear contenedores apagados y restaurar volúmenes'
"${COMPOSE[@]}" create --no-build --pull never
while IFS=$'\t' read -r svc index dest; do
  [[ -n "${svc:-}" ]] || continue
  cid="$("${COMPOSE[@]}" ps -a -q "$svc" | head -n 1)"
  [[ -n "$cid" ]] || { echo "No se encontró $svc" >&2; exit 1; }
  src="$BUNDLE/volumes/$svc/$index.tar"
  [[ -f "$src" ]] || { echo "Falta el volumen respaldado: $src" >&2; exit 1; }
  # Docker cp desde stdin descomprime el tar en el mount antes de arrancarlo.
  docker cp -a - "$cid:${dest%/}/" < "$src"
done < "$BUNDLE/metadata/volumes.tsv"

echo '[5/5] Iniciar servicios'
"${COMPOSE[@]}" up -d --no-build
cat <<EOF

Servicios restaurados. Para verificar la app (podría tardar en iniciar):
  export ADBKEY="\$(cat ~/.android/adbkey)"
  docker compose -f docker-compose.yml -f docker-compose.snapshot.yml exec -T maestro adb connect android-emulator:5555
  docker compose -f docker-compose.yml -f docker-compose.snapshot.yml exec -T maestro adb -s android-emulator:5555 shell pm path com.muvinai.carnet2

Esperado: package:/data/app/.../base.apk (posiblemente junto con split APKs)
Luego probá un test:
  docker compose -f docker-compose.yml -f docker-compose.snapshot.yml exec -T maestro maestro --device android-emulator:5555 test /work/e2e/sedes-visitante.yaml
EOF
