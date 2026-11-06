#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="$(dirname "$MOBILE_DIR")"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${1:-$HOME/sportclub-backups/sportclub-android-$STAMP}"
COMPOSE=(docker compose)
CONTAINERS=()
RUNNING=()
restart_originals() {
  local c
  for c in "${RUNNING[@]}"; do
    if docker container inspect "$c" >/dev/null 2>&1; then
      docker start "$c" >/dev/null 2>&1 || echo "ADVERTENCIA: no se pudo reiniciar $c" >&2
    fi
  done
}
fail() { echo "ERROR: $*" >&2; exit 1; }
command -v docker >/dev/null || fail 'Falta Docker'
command -v tar >/dev/null || fail 'Falta tar'
command -v gzip >/dev/null || fail 'Falta gzip'
cd "$MOBILE_DIR"
# Evitar respaldos privados dentro del repo, incluso si se pasa una ruta personalizada.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -n "$REPO_ROOT" && ( "$OUT" == "$REPO_ROOT" || "$OUT" == "$REPO_ROOT/"* ) ]]; then
  fail 'El respaldo no puede guardarse dentro del repositorio Git. Usá ~/sportclub-backups/.'
fi
if [[ -f "$HOME/.android/adbkey" ]]; then
  export ADBKEY="$(cat "$HOME/.android/adbkey")"
fi
"${COMPOSE[@]}" version >/dev/null || fail 'Falta Docker Compose v2'
[[ ! -e "$OUT" ]] || fail "La carpeta de respaldo ya existe: $OUT"
for service in android-emulator maestro; do
  cid="$("${COMPOSE[@]}" ps -a -q "$service" | head -n 1)"
  [[ -n "$cid" ]] || fail "No se encontró el contenedor del servicio $service. Ejecutá docker compose up -d primero."
  CONTAINERS+=("$cid")
done
mkdir -p "$OUT"/{source,images,metadata,secrets,volumes}
chmod 700 "$OUT" "$OUT/secrets"

for cid in "${CONTAINERS[@]}"; do
  if [[ "$(docker inspect --format '{{.State.Running}}' "$cid")" == true ]]; then
    RUNNING+=("$cid")
  fi
done
trap restart_originals EXIT

echo '[1/6] Registro de configuración, imágenes y montajes (sin exportar variables de entorno)'
{
  echo "date=$STAMP"
  echo "host=$(uname -s)-$(uname -m)"
  docker version --format 'docker_client={{.Client.Version}} docker_server={{.Server.Version}}'
  docker compose version
  for i in 0 1; do
    service=android-emulator
    [[ $i == 1 ]] && service=maestro
    cid="${CONTAINERS[$i]}"
    echo "service=$service container=$cid image_id=$(docker inspect --format '{{.Image}}' "$cid")"
    docker inspect --format '{{range .Mounts}}  mount type={{.Type}} dst={{.Destination}} src={{.Source}}{{println}}{{end}}' "$cid"
  done
} > "$OUT/metadata/inventory.txt"
cp "$MOBILE_DIR/docker-compose.yml" "$OUT/metadata/docker-compose.original.yml"
# Confirmar la app realmente instalada ANTES de congelar el estado del emulador.
"${COMPOSE[@]}" exec -T maestro adb connect android-emulator:5555 >/dev/null 2>&1 || true
if ! "${COMPOSE[@]}" exec -T maestro adb -s android-emulator:5555 shell pm path com.muvinai.carnet2 > "$OUT/metadata/apk-paths.txt"; then
  fail 'No se pudo inspeccionar SportClub en el emulador. Confirmá que Android terminó de iniciar.'
fi
if ! grep -q 'package:' "$OUT/metadata/apk-paths.txt"; then
  fail 'No se encontró com.muvinai.carnet2 instalada. No se generará un falso respaldo exitoso.'
fi
# Localización orientativa de userdata; se guarda solo la ruta, no datos duplicados.
docker exec "${CONTAINERS[0]}" sh -c '
  for dir in /home /root /tmp /data /opt; do
    if [ -d "$dir" ]; then
      find "$dir" -maxdepth 7 -type f -name userdata-qemu.img 2>/dev/null || true
    fi
  done
' > "$OUT/metadata/avd-locations.txt" 2>/dev/null || true

# Se archiva el módulo mobile completo (código, YAML, Dockerfile, evidencia y APK si está en apps/).
# Las dependencias npm se regeneran con npm ci.
echo '[2/6] Copia del proyecto mobile/'
tar -czf "$OUT/source/mobile.tar.gz" \
  --exclude='mobile/node_modules' \
  --exclude='mobile/.gradle' \
  --exclude='mobile/.maestro' \
  -C "$PROJECT_DIR" mobile

if [[ -f "$HOME/.android/adbkey" && -f "$HOME/.android/adbkey.pub" ]]; then
  echo '[3/6] Copia privada de claves ADB (NO subir a Git)'
  cp -p "$HOME/.android/adbkey" "$HOME/.android/adbkey.pub" "$OUT/secrets/"
  chmod 600 "$OUT/secrets/adbkey" "$OUT/secrets/adbkey.pub"
else
  echo 'ADVERTENCIA: No se encontraron ambas claves ~/.android/adbkey(.pub); restaurar autorización ADB manualmente.' >&2
fi

echo '[4/6] Detención controlada para respaldo coherente del emulador'
"${COMPOSE[@]}" stop -t 120 maestro android-emulator
ANDROID_ID="${CONTAINERS[0]}"
MAESTRO_ID="${CONTAINERS[1]}"
ANDROID_IMAGE="sportclub/android-portable:$STAMP"
MAESTRO_IMAGE="sportclub/maestro-portable:$STAMP"
# Una captura de la capa grabable del contenedor; se elimina la clave ADB del ENV de la imagen.
docker commit --change 'ENV ADBKEY=' "$ANDROID_ID" "$ANDROID_IMAGE" >/dev/null
# Maestro no necesita commit: su imagen y los archivos del proyecto se guardan por separado.
docker tag "$(docker inspect --format '{{.Image}}' "$MAESTRO_ID")" "$MAESTRO_IMAGE"
printf 'ANDROID_IMAGE=%q\nMAESTRO_IMAGE=%q\n' "$ANDROID_IMAGE" "$MAESTRO_IMAGE" > "$OUT/metadata/images.env"

# Copiar volúmenes con los contenedores detenidos. No copiar bind mounts: mobile/ ya está
# archivado; ~/.android queda en secrets/ (solo claves); los binds externos se listan para auditoría.
echo '[5/6] Respaldo de volúmenes Docker'
: > "$OUT/metadata/volumes.tsv"
: > "$OUT/metadata/binds-a-revisar.txt"
for i in 0 1; do
  service=android-emulator
  [[ $i == 1 ]] && service=maestro
  cid="${CONTAINERS[$i]}"
  index=0
  while IFS=$'\t' read -r type dest src; do
    [[ -n "${type:-}" ]] || continue
    if [[ "$type" == 'volume' ]]; then
      index=$((index+1))
      destdir="$OUT/volumes/$service"
      mkdir -p "$destdir"
      # Guardar un TAR directamente conserva UID/GID sin crear archivos root-owned en el host.
      docker cp "$cid:${dest%/}/." - > "$destdir/$index.tar"
      printf '%s\t%s\t%s\n' "$service" "$index" "$dest" >> "$OUT/metadata/volumes.tsv"
    elif [[ "$type" == 'bind' ]]; then
      # Las rutas del proyecto y ~/.android están cubiertas solo en el alcance indicado en README.
      printf '%s\t%s\t%s\n' "$service" "$dest" "$src" >> "$OUT/metadata/binds-a-revisar.txt"
    fi
  done < <(docker inspect --format '{{range .Mounts}}{{printf "%s\t%s\t%s\n" .Type .Destination .Source}}{{end}}' "$cid")
done

echo '[6/6] Exportación comprimida de ambas imágenes Docker'
docker image save "$ANDROID_IMAGE" "$MAESTRO_IMAGE" | gzip -1 > "$OUT/images/docker-images.tar.gz"
(
  cd "$OUT"
  find source images metadata volumes secrets -type f -print0 | sort -z | xargs -0 -r sha256sum > SHA256SUMS
)
cat > "$OUT/LEEME.txt" <<EOF
Respaldo SportClub Android + Maestro: $STAMP

Contiene:
  source/mobile.tar.gz         módulo mobile completo
  images/docker-images.tar.gz  Android con capa writable y Maestro
  volumes/                    volúmenes Docker (si existen)
  metadata/volumes.tsv        destinos de volúmenes para restauración
  metadata/binds-a-revisar.txt mounts externos: REVISAR
  secrets/adbkey(.pub)         CLAVES PRIVADAS: NO publicar / NO Git
  SHA256SUMS                  checksums de integridad

MUY IMPORTANTE:
- Archivar CIFRADO si se mueve fuera del equipo: aquí hay datos y credenciales del emulador.
- El snapshot no contiene los datos de volúmenes montados; están en volumes/.
- Los bind mounts externos no incluidos en mobile/ y las claves ADB deben revisarse.
- Consultar mobile/backup/README.md para restauración y prueba con otra PC.
EOF

echo
echo "Respaldo creado en: $OUT"
echo 'Verificá metadata/binds-a-revisar.txt y guardá esta carpeta cifrada.'
echo 'NOTA: no se garantizó la portabilidad hasta ejecutar restore-android.sh en otra PC.'
