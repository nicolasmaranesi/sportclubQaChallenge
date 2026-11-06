# Backup y migración de Android + Maestro (SportClub)

**Alcance:** el módulo `mobile/`, la imagen Maestro, el emulador Android personalizado con su capa de escritura, los volúmenes Docker y las claves de ADB. **No incluye Jenkins**. Presupone Compose con servicios `android-emulator` y `maestro`, y la app `com.muvinai.carnet2` ya instalada.

## En la PC actual

1. Comprobar antes del respaldo que la app funciona:
   ```bash
   cd mobile
   export ADBKEY="$(cat ~/.android/adbkey)"
   docker compose ps
   docker compose exec -T maestro adb -s android-emulator:5555 shell pm path com.muvinai.carnet2
   ```
2. Ejecutar desde `mobile/`:
   ```bash
   bash backup/backup-android.sh
   ```
   Guardará los datos fuera de `mobile/`, por defecto en `~/sportclub-backups/sportclub-android-FECHA/`. **Detiene los dos servicios brevemente y reinicia los que estaban en ejecución**. Requiere espacio en disco considerable (Android x86_64 puede ocupar varios GB).
3. Revisar `metadata/binds-a-revisar.txt`. `mobile/` ya se archiva íntegramente, y `~/.android/adbkey(.pub)` se guarda en `secrets/`. **Otros bind mounts** (en especial un AVD bajo un bind externo) deben copiarse por separado o incorporarse antes de considerar el respaldo completo.
4. Comprobar el tamaño, el checksum y cifrar antes de mover fuera del equipo:
   ```bash
   cd ~/sportclub-backups
   du -sh sportclub-android-*/
   # Desde un directorio distinto al respaldado, ajustá la ruta:
   # Actualizá el nombre de la carpeta antes de ejecutar:
   tar -czf - sportclub-android-FECHA/ | gpg --symmetric --cipher-algo AES256 --output /ruta/segura/sportclub-android-backup.tar.gz.gpg
   ```
   **No subir respaldos sin cifrar a GitHub ni compartir claves ADB**. El contenedor puede contener datos de Play Store y de la aplicación. Para un respaldo sin credenciales es mejor usar una instalación limpia y automatizar la instalación del APK autorizado.

## En otra PC

**Prerrequisitos:** PC **Linux x86_64**, `/dev/kvm` disponible, Docker Engine + Compose v2, permisos Docker, espacio libre suficiente. La versión de Android/emulador y las imágenes se exportan desde el equipo original. Docker Desktop macOS/Windows normalmente no sirve para este método de emulador KVM.

1. Copiar y descifrar/extractar la carpeta del respaldo.
2. Crear la carpeta del repositorio/proyecto donde se quiera colocar `mobile/`. Desde esa carpeta:
   ```bash
   mkdir -p sportclubQaChallenge
   cd sportclubQaChallenge
   tar -xzf /ruta/respaldo/source/mobile.tar.gz
   cd mobile
   bash backup/restore-android.sh /ruta/respaldo
   ```
3. El restaurador importa las imágenes, recupera las claves ADB (sin sobrescribir las existentes), crea los contenedores **apagados**, restaura los volúmenes por destino y levanta el Compose con `docker-compose.snapshot.yml`.
4. Verificar aplicación y correr test:
   ```bash
   export ADBKEY="$(cat ~/.android/adbkey)"
   docker compose -f docker-compose.yml -f docker-compose.snapshot.yml ps
   docker compose -f docker-compose.yml -f docker-compose.snapshot.yml exec -T maestro adb connect android-emulator:5555
   docker compose -f docker-compose.yml -f docker-compose.snapshot.yml exec -T maestro adb -s android-emulator:5555 shell pm path com.muvinai.carnet2
   docker compose -f docker-compose.yml -f docker-compose.snapshot.yml exec -T maestro maestro --device android-emulator:5555 test /work/e2e/sedes-visitante.yaml
   ```
   Si `pm path` aún falla, esperar a que Android termine de arrancar y repetir. Si persiste: revisar dónde guarda el AVD (volumen, bind mount o capa escribible); no asumir que `docker commit` preservó la app hasta **probar la restauración**.

## Preparación para Jenkins (más adelante)

El contrato de ejecución es un comando no interactivo, con `-T`, que Jenkins podrá invocar desde un agente con permisos adecuados para usar Docker:
```bash
docker compose -f docker-compose.yml -f docker-compose.snapshot.yml exec -T maestro \
  maestro --device android-emulator:5555 test /work/e2e/sedes-busqueda.yaml
```

No es necesario instalar el emulador **dentro** del contenedor Jenkins. Los tres servicios pueden compartir la infraestructura Docker. Evitar exponer el daemon Docker mediante TCP sin TLS; montar `/var/run/docker.sock` en Jenkins concede privilegios muy elevados al proceso de Jenkins. Es preferible un agente dedicado y permisos mínimos. Más adelante configurar reportes JUnit, timeouts, espera de `sys.boot_completed` y serialización de ejecuciones sobre el mismo emulador.

## Limitaciones

- Un respaldo del AVD no es genéricamente portable entre distintas arquitecturas o versiones del sistema de emulación. La compatibilidad debe comprobarse con una restauración real.
- `docker commit` **no** incluye los volúmenes, por lo que se respaldan explícitamente.
- Se archiva `mobile/`, no otros módulos del challenge ni el historial Git. Mantener el repositorio completo en Git para el resto del proyecto.
- La contraseña/credenciales de Play Store pueden tener una vigencia o comportamiento de seguridad propio y no está garantizado que permanezcan autenticadas tras mover el AVD.
- El script **no incluye otros bind mounts externos** fuera de `mobile/` y las claves ADB. Revisar siempre el manifiesto antes de dar el respaldo por completo.
