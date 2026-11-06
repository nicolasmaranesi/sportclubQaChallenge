# SportClub QA Challenge

**Proyecto de Quality Assurance y automatización de pruebas** que integra exploración funcional, unit testing, pruebas E2E web y mobile, testing de APIs y una prueba controlada de performance.

La solución está organizada en módulos independientes, ejecutados mediante contenedores, con **Jenkins como orquestador central** y **GitHub Actions como punto de entrada de CI**. Se generan resultados JUnit, reportes HTML, métricas, logs y evidencias que permiten investigar fallos y presentar resultados trazables.



## 1. Estado actual y ejecución de referencia

**Estado: integración CI implementada y validada de punta a punta.**

La ejecución integral de GitHub Actions **#8**, realizada el **6 de noviembre de 2026**, finalizó con **SUCCESS en los seis pipelines**.

**[Ver ejecución exitosa en GitHub Actions](https://github.com/nicolasmaranesi/sportclubQaChallenge/actions/runs/42306162256)** · Commit: `2193b78` · Duración total reportada por GitHub Actions: **8 min 31 s**.

| Pipeline Jenkins | Tecnología principal | Resultado de la ejecución #8 |
| --- | --- | --- |
| `01-Backend-API` | Postman / Newman | **SUCCESS** |
| `02-Web-Unit` | Vitest / TypeScript | **SUCCESS** |
| `03-Mobile-Unit` | Vitest / TypeScript | **SUCCESS** |
| `04-Web-E2E` | Playwright / Chromium | **SUCCESS** |
| `05-Mobile-E2E` | Maestro / Android Emulator | **SUCCESS** |
| `06-Performance` | Apache JMeter | **SUCCESS** |

La exploración manual se documenta por separado y **no constituye un séptimo pipeline automatizado**. Los estados anteriores describen una ejecución concreta: no garantizan que futuras ejecuciones, dependientes de servicios externos, tengan el mismo resultado.

## 2. Objetivos y estrategia de pruebas

- **Cobertura basada en riesgos:** seleccionar escenarios representativos y justificar su impacto sobre navegación, registro, selección de productos y consumo de servicios.
- **Separación de niveles:** diferenciar pruebas exploratorias, unitarias, E2E, APIs y performance.
- **Reproducibilidad:** aislar dependencias y herramientas mediante Docker.
- **Trazabilidad:** conservar test cases, configuraciones, reportes, logs y resultados asociados a una ejecución y un commit.
- **CI centralizada:** evitar que Jenkins dependa del módulo `mobile/`; cada suite mantiene su configuración y su pipeline.
- **Diagnóstico de fallos:** publicar evidencias aun cuando alguna suite no finalice correctamente.

### Stack tecnológico

| Área | Tecnologías y herramientas | Propósito |
| --- | --- | --- |
| Exploración web | Navegadores, matriz manual de escenarios | Validar comportamientos observables y registrar defectos |
| Web Unit | TypeScript, Vitest | Verificar reglas de una implementación simplificada del checkout |
| Mobile Unit | TypeScript, Vitest | Validar lógica aislada relacionada con sedes |
| Web E2E | Playwright, Chromium, Page Object Model | Comprobar flujos de navegación del sitio público |
| Mobile E2E | Maestro, Android Emulator, ADB | Validar navegación como visitante y carga de sedes |
| API | Postman, Newman, Newman HTML Extra | Autenticación, Users, Products y encadenamiento de respuestas |
| Performance | Apache JMeter 5.6.3 | Ejecutar carga moderada y registrar métricas de QuickPizza |
| Orquestación | Jenkins LTS (JDK 21), Job DSL, JCasC | Crear y ejecutar los seis jobs y publicar resultados |
| Infraestructura | Docker Engine, Docker Compose v2, KVM | Ejecutar herramientas y emulador Android |
| CI y entrega | GitHub Actions, Git LFS, GitHub Container Registry | Ejecutar bajo demanda, recuperar APK e imagen Android, distribuir evidencias |
| Notificaciones | Gmail SMTP (opcional) | Enviar resumen y ZIP compacto con resultados |

## 3. Arquitectura implementada

```text
                              GitHub Actions
                    .github/workflows/full-suite.yml
                         workflow_dispatch (manual)
                                  |
                     Ubuntu 24.04 + Docker + KVM
                                  |
                  checkout (Git LFS) + login a GHCR
                                  |
                 compose.yaml (raíz del repositorio)
                                  |
                    Jenkins en contenedor Docker
                     puerto local 127.0.0.1:8085
                                  |
                  JCasC (casc.yml) + Job DSL
                        (jobs.groovy)
                                  |
                       00-Full-Suite
                    [ejecución secuencial]
                                  |
         +------------------------+-----------------------+
         |                        |                       |
    01-Backend-API           02-Web-Unit           03-Mobile-Unit
    Newman / Docker          Vitest / Docker       Vitest / Docker
         |                        |                       |
         +------------------------+-----------------------+
                                  |
         +------------------------+-----------------------+
         |                        |                       |
      04-Web-E2E            05-Mobile-E2E         06-Performance
    Playwright / Docker      Maestro / Docker       JMeter / Docker
                             Android + ADB
                                  |
                     JUnit / HTML / JTL / logs
                                  |
                     Jenkins: test reports +
                          artefactos por job
                                  |
                  GitHub Actions: resumen final,
                    sportclub-qa-results (7 días)
                                  |
                     Gmail SMTP (si está configurado)
```

### Responsabilidades de cada componente

**GitHub Actions** prepara el runner, valida `/dev/kvm`, descarga el repositorio con Git LFS, levanta Jenkins desde la raíz, autentica el acceso a la imagen Android de GHCR, dispara el job `00-Full-Suite` por la API de Jenkins y espera su resultado. Después recupera logs, genera un resumen con el estado de cada pipeline, publica los artefactos y opcionalmente envía un correo.

**Jenkins** se inicia mediante `compose.yaml`, se configura sin pasos manuales mediante **Jenkins Configuration as Code (JCasC)** y crea los jobs con **Job DSL**. El job `00-Full-Suite` llama a los seis jobs en orden, **espera a que termine cada uno**, recopila sus resultados y marca la ejecución integral como fallida si alguna suite falla. Usa `propagate: false` para poder continuar con las suites restantes y presentar un resultado consolidado.

**Docker Compose** mantiene la infraestructura separada: el Compose de la raíz levanta Jenkins y los Compose específicos ejecutan las pruebas de backend, web, mobile y stress. Mobile Unit utiliza una imagen definida en `jenkins/mobile-unit/Dockerfile`.

**Android E2E** utiliza aceleración **KVM**, una imagen base publicada en **GitHub Container Registry (GHCR)**, claves ADB compartidas, instalación de APKs divididos y una ejecución Maestro dentro de Docker. No depende de un teléfono conectado físicamente al runner.

## 4. Estructura del repositorio

Árbol resumido de los archivos relevantes. Los directorios de reportes y evidencias se generan o completan en tiempo de ejecución.

```text
sportclubQaChallenge/
├── .github/
│   └── workflows/
│       └── full-suite.yml                 # Punto de entrada en GitHub Actions
├── backend/
│   ├── collections/                      # Auth/Users y Products de Postman
│   ├── environments/                     # Entorno de ejecución de Newman
│   ├── docker/
│   │   └── Dockerfile
│   ├── reports/                          # JUnit y reportes HTML (generados)
│   └── docker-compose.yaml
├── jenkins/
│   ├── Dockerfile                        # Jenkins LTS + Docker CLI / Compose
│   ├── plugin.txt                        # Plugins instalados
│   ├── casc.yml                          # Configuración declarativa de Jenkins
│   ├── jobs.groovy                       # 00-Full-Suite y seis jobs por tecnología
│   ├── mobile-unit/
│   │   └── Dockerfile
│   └── pipelines/
│       ├── backend-api.jenkinsfile
│       ├── web-unit.jenkinsfile
│       ├── mobile-unit.jenkinsfile
│       ├── web-e2e.jenkinsfile
│       ├── mobile-e2e.jenkinsfile
│       └── performance.jenkinsfile
├── mobile/
│   ├── apks/sportclub/x86_64/           # base.apk + APK split (Git LFS)
│   ├── docker/
│   │   ├── android/                      # Imagen y arranque del emulador
│   │   └── maestro/                      # Imagen de Maestro y ADB
│   ├── e2e/
│   │   ├── common/abrir-sedes.yaml       # Navegación reutilizable
│   │   ├── sedes-visitante.yaml          # Flujo E2E de visitante
│   │   └── evidence/jenkins/            # JUnit y evidencias (generados)
│   ├── scripts/android-setup.sh         # Espera de Android e instalación de APKs
│   ├── src/                              # Lógica aislada para unit testing
│   ├── tests/sedes.unit.test.ts
│   ├── reports/                          # JUnit Mobile Unit (generado)
│   └── docker-compose.yml
├── stress/
│   ├── docker/Dockerfile
│   ├── plans/quickpizza.jmx
│   ├── reports/                          # JTL, logs y dashboard (generados)
│   └── docker-compose.yaml
├── web/
│   ├── docker/                           # Imágenes Web Unit y Web E2E
│   ├── e2e/                              # Tests Playwright
│   ├── src/                              # Modelo de checkout y Page Objects
│   ├── tests/checkout.unit.test.ts
│   ├── playwright.config.ts
│   ├── vitest.config.ts
│   ├── reports/                          # XML JUnit (generados)
│   ├── playwright-report/                # HTML Playwright (generado)
│   ├── test-results/                     # Traces/capturas/videos (generados)
│   └── docker-compose.yaml
├── .env.example                          # Variables para Jenkins local
├── .gitattributes                        # Seguimiento Git LFS de los APKs
├── compose.yaml                          # Jenkins central en la raíz
├── package.json
├── package-lock.json
└── readme.md
```

> **Nota:** el Compose central **no** reemplaza los Compose de las suites. Jenkins está fuera de `mobile/` y orquesta cada módulo desde la raíz del repositorio.

## 5. Requisitos

### Para ejecutar GitHub Actions

- Repositorio accesible desde GitHub Actions y permiso para ejecutar el workflow manualmente.
- Runner `ubuntu-24.04` con Docker y dispositivo **`/dev/kvm`** disponible.
- Archivos APK accesibles mediante Git LFS y permisos para descargar la imagen Android `ghcr.io/nicolasmaranesi/sportclub-android-playstore:13`.
- Permisos de workflow `contents: read` y `packages: read` para checkout y GHCR.
- Opcional: secretos `MAIL_USERNAME` y `MAIL_PASSWORD` si se desea recibir el resumen por Gmail.

### Para ejecutar localmente en Linux

- Docker Engine y Docker Compose v2 (`docker compose`).
- Git y **Git LFS** (`git lfs`) para recuperar los APKs completos.
- Conectividad para descargar imágenes y consultar SportClub, DummyJSON y QuickPizza.
- Para **Mobile E2E**, `/dev/kvm` habilitado y disponible para Docker; ADB funciona dentro de los contenedores.
- Permisos de escritura en los directorios `reports/`, `playwright-report/`, `test-results/` y `evidence/`.

Comprobaciones útiles desde la raíz:

```bash
docker version
docker compose version
git lfs version
git lfs pull
ls -lh mobile/apks/sportclub/x86_64/
ls -l /dev/kvm  # Necesario para Mobile E2E
```

> Ejecutar todos los comandos desde la **raíz del repositorio**, salvo que se indique lo contrario. En Linux, `PUID` y `PGID` permiten que los reportes montados en el host conserven permisos compatibles con el usuario local.

## 6. Ejecución integral en GitHub Actions

El workflow se encuentra en [`.github/workflows/full-suite.yml`](.github/workflows/full-suite.yml). Actualmente utiliza **`workflow_dispatch`**, es decir, **se ejecuta manualmente**, no en cada `push`.

1. Abrir **[Actions → SportClub QA - Full Suite](https://github.com/nicolasmaranesi/sportclubQaChallenge/actions/workflows/full-suite.yml)**.
2. Seleccionar **Run workflow** y elegir la rama `main`.
3. Esperar el resultado del job `Jenkins + Docker + Android KVM`.
4. Revisar la tabla de las seis suites en el **Summary** de la ejecución.
5. Descargar el artefacto **`sportclub-qa-results`** desde la sección **Artifacts** del resumen.

El workflow ejecuta estas actividades:

1. **Checkout con LFS:** `actions/checkout@v4` y `lfs: true` para recuperar los APKs completos.
2. **Preparación del runner:** comprueba Docker, disco y memoria, habilita el acceso a `/dev/kvm` y crea carpetas de reportes.
3. **Arranque de Jenkins:** `docker compose up -d --build jenkins`, con una contraseña temporal de administrador generada para la ejecución de CI.
4. **Disponibilidad y GHCR:** espera el job `00-Full-Suite` y autentica a Jenkins para descargar la imagen de Android.
5. **Orquestación:** lanza `SportClub-Tests/00-Full-Suite` desde la API de Jenkins y consulta su finalización.
6. **Diagnósticos:** recupera las consolas de Jenkins y los logs de contenedores y recursos, incluso si alguna suite falla (`if: always()`).
7. **Publicación:** escribe un resumen por pipeline, arma `sportclub-qa-report.zip` y sube `sportclub-qa-results` con una **retención configurada de siete días**.
8. **Correo opcional:** si existen los secretos SMTP, envía un correo con estado final y un ZIP compacto. Los archivos grandes permanecen en los artefactos de GitHub Actions.

La ejecución integral usa un timeout máximo de **210 minutos** a nivel de GitHub Actions; `00-Full-Suite` también tiene un timeout propio de **180 minutos**.

### Estados y comportamiento ante fallos

Los seis jobs se ejecutan **secuencialmente**. Si uno falla, `00-Full-Suite` registra ese resultado y continúa con los demás; al finalizar, consolida los fallos y entrega `FAILURE` cuando corresponda. Jenkins publica sus resultados desde bloques `finally` cuando el pipeline correspondiente los produce, y GitHub Actions intenta recopilar los logs y artefactos independientemente del estado del test.

La publicación de artefactos no significa que todas las pruebas hayan aprobado: **el estado de cada pipeline debe leerse por separado**.

## 7. Ejecución de Jenkins local

El archivo [`.env.example`](.env.example) define las variables necesarias para levantar el servicio local. No utiliza la contraseña temporal que genera GitHub Actions: esa configuración es específica del runner.

```bash
# Ejecutar desde la raíz
cp .env.example .env

# Editar .env y cambiar JENKINS_ADMIN_PASSWORD por una contraseña local segura.
# Opcional: ajustar PUID y PGID si no son 1000.
export PROJECT_ROOT="$(pwd)"
export PUID="$(id -u)"
export PGID="$(id -g)"

docker compose up -d --build jenkins
docker compose ps
```

Abrir **http://127.0.0.1:8085**. El usuario es `admin` y la contraseña es el valor definido en `.env`.

Jenkins carga `jenkins/casc.yml` y `jenkins/jobs.groovy` al iniciarse. Dentro de **SportClub-Tests** estarán disponibles el job `00-Full-Suite` y las seis suites individuales. Para la corrida completa, seleccionar **`00-Full-Suite` → Build Now**.

Para detener únicamente el Jenkins central:

```bash
docker compose down
```

Este comando no borra el volumen persistente `jenkins_home`; **no** usar `docker compose down -v` si se desea conservarlo. Los contenedores de los módulos utilizan proyectos Compose separados.

**Consideración de seguridad:** el Jenkins local se ejecuta con usuario `root` dentro del contenedor y monta el socket Docker del host (`/var/run/docker.sock`), por lo que tiene privilegios elevados sobre Docker. Su puerto está publicado únicamente en `127.0.0.1:8085`. Está pensado para un entorno de desarrollo/controlado; no debe exponerse a Internet sin rediseñar su seguridad.

## 8. Suites y ejecución individual

Las suites son independientes y pueden ejecutarse sin correr `00-Full-Suite`. Para las pruebas contenedorizadas con salida a carpetas compartidas, se recomienda establecer el usuario local:

```bash
export PUID="$(id -u)"
export PGID="$(id -g)"
```

### 8.1. Exploración manual — SportClub web

La exploración cubre carga de la landing, navegación a planes, cambio entre modalidades mensual/anual, inicio de checkout, comportamiento responsive y validación de campos.

| ID | Escenario de referencia |
| --- | --- |
| `WEB-MANUAL-01` | Carga y navegación de la landing |
| `WEB-MANUAL-02` | Acceso a planes desde «Asociate» |
| `WEB-MANUAL-03` | Cambio entre planes mensuales y anuales |
| `WEB-MANUAL-04` | Inicio de la contratación del plan seleccionado |
| `WEB-MANUAL-05` | Continuidad hasta el checkout, sin finalizar la compra |
| `WEB-MANUAL-06` | Validación de campos obligatorios del formulario |

**Hallazgo exploratorio documentado:** ante un formulario vacío, el campo de número de tarjeta no se resaltó como obligatorio del mismo modo que otros campos. Se trata de una observación manual sobre la interfaz, no de una afirmación sobre el código fuente del sistema. La matriz manual y los defectos se mantienen separados de la ejecución CI.

### 8.2. Web Unit — Vitest

**Objetivo:** validar de forma aislada las reglas de un checkout simplificado, implementadas en `web/src/checkout.ts` y verificadas en `web/tests/checkout.unit.test.ts`. Incluye casos válidos e inválidos, campos vacíos, formato de datos y bloqueo del avance.

```bash
docker compose -p web -f web/docker-compose.yaml \
  run --rm -T --build web-unit
```

**JUnit:** `web/reports/unit-results.xml`.

> Esta implementación es un **modelo de prueba propio**, no el código productivo de SportClub. Su resultado no demuestra por sí solo el funcionamiento interno del sitio real.

### 8.3. Mobile Unit — Vitest

**Objetivo:** verificar lógica aislada relacionada con sedes, sin iniciar un emulador. Las pruebas están en `mobile/tests/sedes.unit.test.ts`.

El job Jenkins construye una imagen Node desde `jenkins/mobile-unit/Dockerfile` y ejecuta Vitest:

```bash
mkdir -p mobile/reports

docker build -t sportclub/mobile-unit:local \
  -f jenkins/mobile-unit/Dockerfile .

docker run --rm \
  --mount "type=bind,source=$(pwd)/mobile/reports,target=/workspace/mobile/reports" \
  sportclub/mobile-unit:local
```

**JUnit:** `mobile/reports/unit-results.xml`.

### 8.4. Web E2E — Playwright

**Target:** `https://www.sportclub.com.ar/`.

**Flujo principal:** `Landing → Asociate → modalidad mensual → Plan Total → checkout (paso 2)`. La suite usa Page Object Model, localizadores de interfaz y el proyecto Chromium; no concreta compras.

| ID | Escenario |
| --- | --- |
| `WEB-E2E-01` | Landing → Asociate → Total mensual → checkout |
| `WEB-E2E-02` | Cambiar mensual → anual → mensual |
| `WEB-E2E-03` | Verificar planes mensuales Plus, Flex y Total |
| `WEB-E2E-04` | Verificar el flujo bajo una resolución móvil |

```bash
docker compose -p web -f web/docker-compose.yaml \
  run --rm -T --build web-e2e
```

**Evidencias:** `web/reports/e2e-results.xml`, `web/playwright-report/` y `web/test-results/`. La configuración conserva capturas y videos ante fallos y trazas según `PW_TRACE`.

### 8.5. Mobile E2E — Maestro + Android

**Target:** aplicación SportClub, paquete `com.muvinai.carnet2`, instalada desde los APKs de `mobile/apks/sportclub/x86_64/`.

El Compose de Mobile gestiona cuatro servicios:

| Servicio | Función |
| --- | --- |
| `adb-keygen` | Genera o reutiliza las claves ADB compartidas |
| `android-emulator` | Arranca Android con KVM e imagen base de GHCR; expone ADB por la red Docker |
| `android-setup` | Espera el arranque, instala los APKs con `adb install-multiple` y verifica el paquete |
| `maestro` | Se conecta al emulador y ejecuta los flows YAML |

El caso `mobile/e2e/sedes-visitante.yaml` navega como visitante hasta **Sedes** y valida que se muestren **`Google Map`** y **`Filtros`**. En una instalación limpia, el recorrido inicial debe contemplar el **onboarding** y **«Ingreso sin registro»** antes de intentar abrir Sedes.

Los APKs están gestionados mediante **Git LFS**; el checkout de GitHub Actions usa `lfs: true`. La imagen Android se basa en `ghcr.io/nicolasmaranesi/sportclub-android-playstore:13` y requiere acceso a ese paquete.

```bash
# En Linux, comprobar KVM y recuperar APKs antes de ejecutar
ls -l /dev/kvm
git lfs pull

# Construir imágenes y levantar la cadena de dependencias
# (adb-keygen → android-emulator → android-setup → maestro)
docker compose -p mobile -f mobile/docker-compose.yml \
  build maestro android-emulator

docker compose -p mobile -f mobile/docker-compose.yml \
  up -d --no-build maestro

# Ejecutar el flujo y generar JUnit
docker compose -p mobile -f mobile/docker-compose.yml \
  exec -T maestro \
  maestro --device android-emulator:5555 \
  test --format junit \
  --output /work/e2e/evidence/jenkins/maestro-junit.xml \
  /work/e2e/sedes-visitante.yaml
```

**JUnit y evidencias:** `mobile/e2e/evidence/jenkins/`. Para diagnosticar errores de arranque se conservan los logs de `android-setup`, emulador, Maestro y ADB en `ci-artifacts/` cuando la suite corre por GitHub Actions.

Para revisar los contenedores:

```bash
docker compose -p mobile -f mobile/docker-compose.yml ps -a
docker compose -p mobile -f mobile/docker-compose.yml logs android-setup
```

### 8.6. Backend API — Postman + Newman

**Target:** `https://dummyjson.com`, API pública de demostración **independiente de SportClub**.

**Bloque A — Auth / Users:** login, token, consulta del usuario autenticado, cruce entre recursos, refresh y escenarios negativos.

**Bloque B — Products:** listado, detalle, búsqueda, paginación, ordenamiento, filtros y operaciones simuladas de alta, modificación y baja.

```bash
BASE_URL=https://dummyjson.com \
  docker compose -p backend -f backend/docker-compose.yaml \
  run --rm -T --build api-tests
```

Se generan reportes por colección:

```text
backend/reports/
├── auth-users-results.xml
├── auth-users-report.html
├── products-results.xml
└── products-report.html
```

**Hallazgo conocido:** en una ejecución explorada, `GET /auth/me` con Bearer inválido devolvió **HTTP 500** en lugar del rechazo esperable de autenticación (habitualmente 401). La colección fue alineada con el comportamiento observado para registrar el resultado de la API, **pero un test verde no convierte ese comportamiento en correcto**. Debe mantenerse identificado como hallazgo de calidad.

Las operaciones de escritura de Products son **simuladas por DummyJSON**: no implican persistencia real de esos cambios.

### 8.7. Performance — JMeter sobre QuickPizza

**Target:** `https://quickpizza.grafana.com`. No se ejecuta carga sobre SportClub.

| Parámetro | Configuración |
| --- | --- |
| Tipo | Carga moderada y controlada |
| Usuarios virtuales | 2 |
| Ramp-up | 10 s |
| Duración | 30 s |
| Think time | 2.000 ms |
| Endpoints | `GET /api/doughs` y `POST /api/pizza` |
| Ejecución | Requests secuenciales por usuario, sin buscar saturación |

```bash
docker compose -p stress -f stress/docker-compose.yaml \
  run --rm -T --build jmeter
```

El plan está en `stress/plans/quickpizza.jmx` y corre en modo no gráfico. Cada ejecución guarda resultados en una carpeta identificada por fecha e ID:

```text
stress/reports/run-<fecha>-<id>/
├── results.jtl
├── jmeter.log
└── dashboard/
    └── index.html
```

**Criterios de análisis definidos para el challenge** (no son SLA oficiales de QuickPizza): **p95 global ≤ 2.000 ms**, **tasa de éxito ≥ 95 %** y **al menos seis muestras** para un análisis básico. También se revisan throughput, promedio, máximos, errores y APDEX.

**Referencia histórica — ejecución individual del 6/11/2026:** 24 muestras, 0 % de errores, promedio 256,88 ms, p95 global 888 ms, máximo 1.005 ms, throughput 0,87 req/s y APDEX 0,958. Estos valores pertenecen a aquella ejecución de referencia y **no deben atribuirse automáticamente a la corrida integral #8**.

> **Limitación del quality gate:** el pipeline actualmente ejecuta JMeter y archiva sus resultados. Los umbrales de p95 y tasa de éxito están documentados como criterios de evaluación; no se debe dar por implementado un gate automático sobre el JTL mientras no exista un paso que los calcule y falle expresamente el job si no se cumplen. El código de salida de JMeter por sí solo no reemplaza ese análisis.

## 9. Reportes, evidencias y trazabilidad

Jenkins publica resultados JUnit y archiva los archivos generados por sus jobs. GitHub Actions los reúne en un artefacto accesible desde el resumen de la ejecución.

| Suite / etapa | Evidencia principal | Ubicación en el repositorio o runner |
| --- | --- | --- |
| Backend API | JUnit XML y HTML Newman | `backend/reports/` |
| Web Unit | JUnit XML | `web/reports/unit-results.xml` |
| Mobile Unit | JUnit XML | `mobile/reports/unit-results.xml` |
| Web E2E | JUnit, reporte HTML, screenshots/videos/traces cuando correspondan | `web/reports/`, `web/playwright-report/`, `web/test-results/` |
| Mobile E2E | JUnit Maestro y evidencias del flujo | `mobile/e2e/evidence/` |
| Performance | JTL, log y dashboard HTML | `stress/reports/run-*/` |
| Infraestructura CI | Consolas de los siete jobs, estado de contenedores y logs de Android | `ci-artifacts/` |
| Resumen de entrega | Estado general, estado por suite y ZIP compacto | Summary de GitHub Actions y `sportclub-qa-report.zip` |

**Artefacto de GitHub Actions:** `sportclub-qa-results`, con retención de **7 días** según el workflow. Contiene las carpetas de resultados disponibles, logs de CI y el ZIP compacto para correo. La presencia de un archivo depende de que el proceso correspondiente haya logrado generarlo.

**Notificación por correo:** solo se activa si están configurados `MAIL_USERNAME` y `MAIL_PASSWORD` en **GitHub Actions Secrets**. El correo incluye resumen de los seis jobs y, cuando corresponde, un ZIP con XML/HTML pequeños. Videos y capturas voluminosas se consultan desde el artefacto de Actions.

Para una entrega técnica reproducible, conviene conservar el vínculo a la ejecución, el SHA del commit, el resultado por job y los reportes originales. La matriz manual de escenarios y el bug tracking son entregables complementarios.

## 10. Decisiones técnicas, riesgos y límites

- **Orquestador desacoplado:** Jenkins está en `jenkins/` y se levanta desde `compose.yaml` en la raíz; `mobile/` no controla las demás pruebas.
- **Ejecución controlada:** el workflow actual solo acepta disparos manuales (`workflow_dispatch`). La prueba sobre QuickPizza forma parte de la suite completa, por lo que no se dispara automáticamente en cada commit.
- **Servicios externos:** cambios de UI, disponibilidad, latencia, geolocalización o comportamiento de SportClub, DummyJSON y QuickPizza pueden afectar las suites sin cambios en el repositorio.
- **Instalación Mobile:** emulador nuevo implica datos limpios; los pasos de onboarding e ingreso sin registro deben considerarse parte de la precondición E2E.
- **Aceleración Android:** el runner Mobile E2E necesita KVM y la imagen base de GHCR; no es una suite portable a cualquier runner sin estos requisitos.
- **Recursos de CI:** Jenkins, Docker y el emulador comparten CPU, RAM y espacio de disco del runner.
- **Seguridad:** no versionar `.env`, secretos SMTP, tokens o credenciales. El socket Docker del host supone privilegios elevados. Respetar los permisos y condiciones de redistribución de APKs de terceros.
- **Resultados funcionales:** diferenciar el estado técnico de una aserción de la conformidad del producto. El ejemplo del HTTP 500 de DummyJSON es un hallazgo aunque el test lo registre sin fallar.
- **Performance:** dos usuarios durante 30 segundos permiten una evaluación limitada, pero **no** caracterizan capacidad máxima, estrés, resistencia ni SLA.
- **Limpieza:** evitar publicar `node_modules/`, cachés y volúmenes como artefactos; archivar solo logs y evidencias necesarias.

## 11. Mejoras futuras identificadas

La **integración de las seis suites ya está terminada y validada**. Las siguientes mejoras no bloquean la ejecución actual:

1. Incorporar un **quality gate automático sobre el JTL** que calcule p95 y tasa de éxito y falle el job ante incumplimientos de los criterios definidos.
2. Mantener los **selectores y precondiciones Mobile** frente a cambios de onboarding, autenticación de visitante o interfaz.
3. Ampliar, cuando esté justificado, la **cobertura negativa y la trazabilidad** entre escenarios manuales, tests automatizados y defectos.
4. Revisar periódicamente las versiones de las **GitHub Actions**, las imágenes y los plugins de Jenkins para mantener la compatibilidad.
5. Considerar mecanismos de publicación de reportes históricos de mayor duración si la retención de siete días es insuficiente para la evaluación.

---

**SportClub QA Challenge** · QA Automation · Playwright · Maestro · Vitest · Newman · JMeter · Jenkins · Docker · GitHub Actions  
**Última ejecución integral documentada:** [#8 — SUCCESS (6/6)](https://github.com/nicolasmaranesi/sportclubQaChallenge/actions/runs/42306162256) · **Fecha:** 6 de noviembre de 2026.
