# SportClub QA Challenge

Proyecto de aseguramiento de calidad que reúne **exploración manual, pruebas unitarias, automatización E2E web y móvil, pruebas funcionales de API y performance controlada**. Cada módulo se organiza de forma independiente y utiliza Docker cuando corresponde. La etapa final será la orquestación de todas las suites mediante **Jenkins**.

> **Alcance y seguridad:** las pruebas web navegan sobre páginas públicas de SportClub y **no finalizan pagos ni contrataciones**. Los tests de API utilizan **DummyJSON**, y la prueba de rendimiento se ejecuta **exclusivamente contra QuickPizza**, con carga pequeña y duración limitada. No se realizan pruebas de carga sobre sistemas productivos de SportClub.

## 1. Objetivos

- Diseñar pruebas a partir de requisitos y comportamientos observables, con una selección justificada de escenarios críticos.
- Distinguir **pruebas exploratorias, unitarias, E2E, de integración/API y de performance**.
- Mantener suites independientes, reproducibles y ejecutables desde contenedores.
- Generar evidencias (reportes, logs, capturas, trazas y resultados crudos) para facilitar el análisis de fallos.
- Centralizar la ejecución y la publicación de resultados en **Jenkins**, sin acoplar CI a un módulo particular.

## 2. Stack tecnológico

| Área | Herramientas | Propósito |
| --- | --- | --- |
| Mobile | Maestro, Android Emulator, ADB, Docker | Flujos móviles y validaciones de interfaz |
| Web unit | TypeScript, Vitest | Reglas aisladas de una implementación simplificada |
| Web E2E | TypeScript, Playwright, Chromium, Docker | Flujos públicos de navegación desde la perspectiva del usuario |
| Backend | Postman Collections, Newman, Newman HTML Extra, Docker | Contratos, autenticación y relación entre endpoints REST |
| Performance | Apache JMeter 5.6.3, JMX, Docker | Carga moderada y métricas de QuickPizza |
| CI/CD (siguiente etapa) | Jenkins, Docker Compose | Ejecutar suites, evaluar resultados y archivar evidencias |

## 3. Estado del proyecto

| Módulo | Estado actual | Evidencia de la última validación comunicada |
| --- | --- | --- |
| Exploración web | Realizada | Escenarios manuales y hallazgo en validación del checkout |
| Mobile | Suite ejecutada en Docker | Flujo de sedes con Maestro; integración CI pendiente |
| Web unit | Funcionando | Pruebas de validación del checkout con Vitest |
| Web E2E | **4/4 PASS** | Playwright en Docker; ejecución completa de 26,9 s |
| Backend — Auth/Users | **7 requests / 14 assertions PASS** | Newman en Docker; véase observación sobre HTTP 500 |
| Backend — Products | **14 requests / 28 assertions PASS** | Newman en Docker |
| Performance — QuickPizza | **24/24 muestras correctas** | Dashboard JMeter, 0 % de errores, p95 global 888 ms |
| Jenkins | **Pendiente** | Arquitectura y etapas previstas en este README |

Los números corresponden a ejecuciones concretas y **no** representan una monitorización permanente ni garantizan que futuras corridas tengan el mismo resultado.

## 4. Organización del repositorio

Estructura de referencia basada en los módulos utilizados. Las carpetas de reportes se generan o completan durante la ejecución.

```text
sportclubQaChallenge/
├── backend/
│   ├── collections/
│   │   ├── auth-users.postman_collection.json
│   │   └── products.postman_collection.json
│   ├── docker/
│   │   └── Dockerfile
│   ├── environments/
│   │   └── sportclub.ci.postman_environment.json
│   ├── reports/
│   └── docker-compose.yml
├── jenkins/                         # Integración CI central pendiente
├── mobile/
│   ├── docker/
│   ├── e2e/
│   ├── src/
│   ├── tests/
│   ├── evidence/
│   └── docker-compose.yml
├── stress/
│   ├── docker/
│   │   └── Dockerfile
│   ├── plans/
│   │   └── quickpizza.jmx
│   ├── reports/
│   └── docker-compose.yaml
├── web/
│   ├── docker/
│   │   └── Dockerfile
│   ├── e2e/
│   │   └── checkout.e2e.spec.ts
│   ├── src/
│   │   ├── checkout.ts
│   │   └── pages/
│   │       ├── sportclub-landing.page.ts
│   │       └── sportclub-checkout.page.ts
│   ├── tests/
│   │   └── checkout.unit.test.ts
│   ├── playwright.config.ts
│   ├── vitest.config.ts
│   ├── docker-compose.yml
│   ├── playwright-report/           # Generado
│   ├── test-results/                # Generado
│   └── reports/                     # Generado
├── compose.yaml                     # Orquestación raíz, a integrar con Jenkins
├── package.json
└── README.md
```

**Criterio de diseño:** Jenkins vive en la raíz o en `jenkins/`, separado de `mobile/`, y ejecutará los Compose de `mobile/`, `web/`, `backend/` y `stress/`. Cada módulo conserva sus dependencias y resultados.

## 5. Requisitos y convenciones

- Docker Engine y el complemento **Docker Compose v2** (`docker compose`).
- Acceso a Internet para las pruebas que consultan servicios públicos y para descargar imágenes.
- Node.js/npm para ejecutar Vitest localmente; las suites Docker incluyen las dependencias necesarias en sus imágenes.
- Para Mobile: emulador Android operativo, conectividad ADB y autorizaciones correspondientes.
- Linux: usar `PUID=$(id -u)` y `PGID=$(id -g)` en los servicios que mapean el usuario local; garantizar escritura en las carpetas `reports/` y evidencias.
- Ejecutar los comandos desde la **raíz del repositorio**, salvo que se indique lo contrario. Las rutas de Docker Compose se resuelven respecto de la ubicación del archivo Compose.

**Validación de servicios disponibles:**

```bash
docker compose -f mobile/docker-compose.yml config --services
docker compose -f web/docker-compose.yml config --services
docker compose -f backend/docker-compose.yml config --services
docker compose -f stress/docker-compose.yaml config --services
```

## 6. Exploración manual — SportClub web

La exploración abarca carga de la landing, navegación hacia planes, cambio entre planes mensuales y anuales, inicio del checkout y revisión de formularios. La prioridad se asigna según el impacto en navegación, selección de producto y contratación.

Escenarios de referencia:

| ID | Cobertura |
| --- | --- |
| WEB-MANUAL-1 | Carga y navegación de la landing |
| WEB-MANUAL-2 | Acceso a la sección de planes desde «Asociate» |
| WEB-MANUAL-3 | Cambio entre planes mensuales y anuales |
| WEB-MANUAL-4 | Inicio de contratación del plan seleccionado |
| WEB-MANUAL-5 | Continuidad del checkout conforme al recorrido observado |
| WEB-MANUAL-6 | Validación de campos obligatorios en checkout |

**Hallazgo exploratorio:** en el escenario de formulario vacío se observó que el campo número de tarjeta no se resaltaba como obligatorio del mismo modo que otros campos. Esta observación es una **evidencia manual**, no una afirmación sobre el código fuente real. No se realizó un pago.

La matriz de exploración puede conservarse en Google Sheets u otro registro separado con resultado esperado/obtenido, prioridad y evidencias.

## 7. Unit Testing — implementación simplificada

**Sección elegida:** validación del formulario de checkout. La consigna permite modelar reglas propias porque no se dispone del código real de SportClub.

La implementación en `web/src/checkout.ts` modela la obligatoriedad y formatos de los campos definidos para el ejercicio. Los tests en `web/tests/checkout.unit.test.ts` verifican entradas válidas e inválidas, campos vacíos, formatos incorrectos y bloqueo del avance.

> Los tests unitarios verifican el **modelo simplificado**, no el código de producción de SportClub. La visualización de mensajes y resaltados se valida por separado mediante pruebas de interfaz.

**Ejecutar desde la raíz:**

```bash
cd web
npx vitest run --config vitest.config.ts
cd ..
```

Si está configurado el script correspondiente en `web/package.json`, también puede ejecutarse `npm run test:unit`.

## 8. E2E web — Playwright

**Flujo principal:** `landing → Asociate → modalidad mensual → Plan Total → checkout, paso 2`.

**Rutas utilizadas:**

- Landing: `https://www.sportclub.com.ar/`
- Checkout observado en la ejecución: `https://checkout.sportclub.com.ar/paso2/promocion-plan-total-mensual-ecommerce`

La selección de elementos utiliza Page Objects y localizadores orientados a la interfaz (roles, nombres accesibles y contexto de la tarjeta), evitando depender exclusivamente de rutas `href` que pueden cambiar.

| ID | Escenario |
| --- | --- |
| WEB-E2E-01 | Landing → Asociate → Total Mensual → checkout paso 2 |
| WEB-E2E-02 | Cambiar Mensual → Anual → Mensual |
| WEB-E2E-03 | Verificar catálogo mensual Plus, Flex y Total |
| WEB-E2E-04 | Verificar disponibilidad del flujo en resolución móvil |

**Ejecutar desde la raíz:**

```bash
PUID=$(id -u) PGID=$(id -g) \
docker compose -f web/docker-compose.yml run --rm --build web-e2e
```

**Evidencias:**

- `web/playwright-report/index.html`: reporte HTML.
- `web/reports/e2e-results.xml`: resultados JUnit.
- `web/test-results/artifacts/`: capturas, videos y trazas según la configuración del test.

El E2E se detiene **antes de ingresar datos para concretar pagos o contrataciones**.

## 9. Backend — Postman y Newman sobre DummyJSON

**Target:** `https://dummyjson.com` (API de demostración, no sistemas de SportClub).

### Bloque A — Auth / Users

Incluye siete requests para token inválido, login correcto, perfil autenticado, cruce Auth/Users, renovación de token, perfil con token renovado y login con contraseña incorrecta. Se validan códigos HTTP, estructura JSON, tokens y consistencia entre operaciones.

### Bloque B — Products

Incluye catorce requests para listado, detalle relacionado, paginación, búsqueda, ordenamiento, filtros, alta simulada, lectura posterior, PATCH simulado, lectura posterior al PATCH, DELETE simulado, lectura posterior al DELETE, producto inexistente y búsqueda vacía.

**Ejecutar desde la raíz:**

```bash
BASE_URL=https://dummyjson.com \
docker compose -f backend/docker-compose.yml run --rm --build api-tests
```

El contenedor ejecuta ambas colecciones secuencialmente y guarda reportes independientes:

```text
backend/reports/
├── auth-users-results.xml
├── auth-users-report.html
├── products-results.xml
└── products-report.html
```

**Observación relevante — API-AUTH-01:** en la ejecución observada `GET /auth/me` con un Bearer inválido respondió **HTTP 500**, en lugar del rechazo de autenticación que normalmente se esperaría (401). La colección se ajustó para verificar el comportamiento **observado**, por eso el último reporte aparece en verde. **Eso no equivale a declarar correcto el comportamiento del servicio**: debe registrarse como hallazgo conocido y distinguirse de un resultado funcional conforme a la expectativa ideal.

Las operaciones de alta, modificación y eliminación de Products son **simuladas por DummyJSON**; no se interpretan como escrituras persistentes reales.

## 10. Performance — JMeter sobre QuickPizza

**Target:** `https://quickpizza.grafana.com`, entorno público compartido de demostración. **No** se ejecuta carga sobre SportClub.

### Modelo de carga

| Parámetro | Configuración |
| --- | --- |
| Tipo | Prueba controlada de carga moderada |
| Usuarios virtuales | 2 |
| Ramp-up | 10 s |
| Duración | 30 s |
| Think time | 2.000 ms por request |
| Requests | `GET /api/doughs` y `POST /api/pizza` |
| Ejecución | Secuencial por usuario, sin buscar saturación |

Los samplers incorporan assertions de código HTTP y contenido esperado. El JMX se guarda en `stress/plans/quickpizza.jmx` y el **View Results Tree está deshabilitado** para la corrida no gráfica.

**Ejecutar desde la raíz:**

```bash
PUID=$(id -u) PGID=$(id -g) \
docker compose -f stress/docker-compose.yaml run --rm --build jmeter
```

Cada ejecución crea un directorio en `stress/reports/run-<fecha>-<id>/` con `results.jtl`, `jmeter.log` y `dashboard/index.html`.

### Criterios definidos para este ejercicio

- **p95 global ≤ 2.000 ms**.
- **Tasa de éxito ≥ 95 %**.
- **Al menos seis muestras** para poder hacer una revisión básica de resultados.
- Revisar errores HTTP, promedios, máximos, throughput y APDEX. Los límites anteriores son **criterios del ejercicio, no SLA oficiales**.

### Resultado registrado — ejecución del 6 de noviembre de 2026

| Métrica | Resultado |
| --- | ---: |
| Muestras totales | 24 |
| Errores | 0 (0 %) |
| Promedio global | 256,88 ms |
| p95 global | 888 ms |
| Máximo observado | 1.005 ms |
| Throughput global | 0,87 requests/s |
| APDEX global | 0,958 |
| GET `/api/doughs` | 13 muestras, p95 1.005 ms |
| POST `/api/pizza` | 11 muestras, p95 344 ms |

**Conclusión:** bajo esta carga breve y controlada, los resultados cumplieron los criterios establecidos. La muestra no permite estimar capacidad máxima, comportamiento a gran escala ni resistencia ante una prueba de estrés. El dashboard y el JTL son la evidencia de esta ejecución.

## 11. Jenkins — diseño de la integración central (pendiente)

> **Estado real:** al momento de redactar este README, las suites se han ejecutado **por separado**. La configuración completa y la primera corrida integral en Jenkins **aún no fueron implementadas**. La siguiente sección documenta la arquitectura y los requisitos de esa etapa.

### Arquitectura objetivo

```text
                      Jenkins (CI central)
                              |
          +-------------------+-------------------+
          |                   |                   |
       Mobile                Web                Backend
   Maestro + Docker     Vitest / Playwright    Newman + Docker
          |                   |                   |
          +-------------------+-------------------+
                              |
                    Stress (controlado)
                      JMeter + Docker
                              |
                  Reportes y evidencias
          JUnit / HTML / JTL / logs / capturas
```

**Ubicación:** Jenkins se configurará fuera de `mobile/`, preferentemente con un directorio `jenkins/` para imagen/configuración y un `Jenkinsfile` en la raíz. El `compose.yaml` raíz podrá arrancar Jenkins y los servicios de infraestructura necesarios, mientras que cada suite seguirá usando su Compose propio.

### Etapas propuestas del pipeline

| Etapa | Acción prevista | Criterio para la integración |
| --- | --- | --- |
| Checkout | Obtener el código del repositorio | Commit y rama identificables |
| Validaciones previas | Verificar Docker, Compose, archivos y configuración | Fallar ante configuraciones incompletas |
| Web Unit | Ejecutar Vitest | Falla si cualquier test unitario falla |
| Mobile Unit / E2E | Preparar emulador, ADB y ejecutar Maestro; incorporar unit según runner final | Emulador disponible, reportes y logs conservados |
| Web E2E | Ejecutar `web-e2e` con Playwright | Código de salida y JUnit; adjuntar traces ante fallos |
| Backend API | Ejecutar `api-tests` con Newman | Ambas colecciones deben ejecutarse; publicar dos XML JUnit |
| Performance (opcional/controlada) | Ejecutar JMeter contra QuickPizza | Carga pequeña y disparo deliberado, no en cada push |
| Publicación | Reunir JUnit y archivar artefactos | Reportes accesibles por build, aun cuando haya fallos |
| Limpieza | Detener servicios temporales | Sin contenedores huérfanos |

**Comandos base que Jenkins ejecutará desde la raíz:**

```bash
# Web E2E
PUID=$(id -u) PGID=$(id -g) docker compose -f web/docker-compose.yml run --rm --build web-e2e

# Backend API
BASE_URL=https://dummyjson.com docker compose -f backend/docker-compose.yml run --rm --build api-tests

# JMeter: solo al habilitar expresamente la etapa de performance
PUID=$(id -u) PGID=$(id -g) docker compose -f stress/docker-compose.yaml run --rm --build jmeter
```

Para **Web Unit**, inicialmente se usará Vitest; antes de cerrar CI se decidirá si se ejecuta con Node en el agente o mediante un contenedor dedicado. Para **Mobile**, el pipeline tendrá que garantizar primero el inicio y disponibilidad del emulador y del acceso ADB; la suite no debe lanzarse antes de esa comprobación.

### Reportes que deberá publicar Jenkins

| Tipo | Ruta de referencia |
| --- | --- |
| JUnit Web E2E | `web/reports/e2e-results.xml` |
| HTML Playwright | `web/playwright-report/` |
| Evidencias Playwright | `web/test-results/` |
| JUnit Backend | `backend/reports/*-results.xml` |
| HTML Newman | `backend/reports/*-report.html` |
| JMeter JTL, log y dashboard | `stress/reports/run-*/` |
| Mobile | `mobile/evidence/` y reportes que se configuren en su runner |

**Pendientes técnicos específicos antes de declarar CI finalizada:**

1. Implementar el `Jenkinsfile` y el despliegue de Jenkins mediante Docker.
2. Definir permisos de Docker para el agente Jenkins y propiedad de volúmenes. Montar `/var/run/docker.sock`, si se opta por ello, implica privilegios elevados y debe protegerse.
3. Configurar disponibilidad del emulador/ADB y las pruebas unitarias del módulo Mobile dentro del pipeline.
4. Publicar resultados JUnit con Jenkins y conservar evidencias como artefactos del build.
5. Añadir un **quality gate de performance** que analice el JTL: JMeter puede finalizar con código 0 aunque existan samples fallidos, por lo que no alcanza con su exit code.
6. Proteger las variables y secretos mediante Jenkins Credentials; no persistir tokens ni contraseñas en Git o reportes públicos.
7. Ejecutar una corrida integral y verificar que un fallo real de cualquiera de las etapas se refleje correctamente en Jenkins.

Por respeto al entorno público compartido, la etapa de QuickPizza debe ejecutarse **de manera manual o con una frecuencia limitada**, nunca automáticamente en cada commit.

## 12. Evidencias y reproducibilidad

Cada entrega debe incluir el código o plan que produjo el resultado, la versión del entorno, una ejecución identificable y el reporte correspondiente. Se recomienda registrar fecha, commit, parámetros de carga, versión de herramientas y observaciones cuando una prueba falle.

- **Web:** HTML de Playwright, JUnit, screenshots/traces/videos según el resultado.
- **Backend:** HTML y XML por colección. Evitar compartir reportes con datos sensibles.
- **Stress:** JMX, JTL, dashboard y análisis breve de métricas por ejecución.
- **Mobile:** flows Maestro, logs y capturas/evidencias generadas.
- **Manual:** matriz de escenarios, resultados esperado/obtenido y hallazgos.

Los resultados históricos son evidencia puntual: no deben reemplazarse por estadísticas inventadas ni interpretarse como un SLA del servicio externo.

## 13. Buenas prácticas y límites

- **No completar operaciones reales de pago o contratación** en el sitio de SportClub.
- **No ejecutar pruebas de performance contra SportClub productivo.** Solo QuickPizza y siempre con carga acotada.
- No aumentar VUs ni duración sin revisar el impacto sobre el entorno compartido.
- No subir archivos de secretos, credenciales, tokens o reportes sensibles al repositorio.
- Excluir de Git `node_modules/`, reportes generados, trazas y artefactos grandes, conservándolos en Jenkins como artefactos por build cuando corresponda.
- Separar el resultado de una **assertion técnica** de la conclusión de calidad: un test puede pasar porque captura un comportamiento inesperado conocido, como el HTTP 500 de DummyJSON.
- Priorizar selectores semánticos y Page Object Model en UI; validar contratos y encadenamiento de datos en API; interpretar métricas y tamaño de muestra en performance.

## 14. Próximos pasos

1. Preparar Jenkins en `jenkins/` y el Compose central de la raíz.
2. Implementar el pipeline completo con las suites ya validadas de manera independiente.
3. Incorporar los quality gates y el archivado de reportes/evidencias.
4. Realizar una corrida integrada, revisar fallos y actualizar este README con su resultado real.

---

**Proyecto:** SportClub QA Challenge · **Enfoque:** QA Automation, testing funcional y performance controlada · **Estado:** suites modulares verificadas; integración CI con Jenkins pendiente.
