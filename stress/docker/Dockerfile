FROM eclipse-temurin:17-jre-jammy

ARG JMETER_VERSION=5.6.3
# Checksum oficial de apache-jmeter-5.6.3.tgz (actualizar si cambia la version).
ARG JMETER_SHA512=5978a1a35edb5a7d428e270564ff49d2b1b257a65e17a759d259a9283fc17093e522fe46f474a043864aea6910683486340706d745fcdf3db1505fd71e689083

ENV JMETER_HOME=/opt/apache-jmeter-${JMETER_VERSION} \
    PATH=/opt/apache-jmeter-${JMETER_VERSION}/bin:${PATH} \
    JAVA_TOOL_OPTIONS=-Djava.awt.headless=true

# Descarga con mirrors alternativos, reintentos y validacion de integridad.
RUN set -eu; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        ca-certificates curl fonts-dejavu-core; \
    downloaded=0; \
    for url in \
        "https://downloads.apache.org/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz" \
        "https://dlcdn.apache.org/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz" \
        "https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz"; do \
        echo "Intentando descargar JMeter desde: ${url}"; \
        if curl --fail --location --silent --show-error \
                --retry 2 --retry-all-errors --retry-delay 2 \
                --connect-timeout 15 --max-time 180 \
                --output /tmp/apache-jmeter.tgz "${url}" \
           && printf '%s  %s\n' "${JMETER_SHA512}" /tmp/apache-jmeter.tgz | sha512sum --check --status; then \
            downloaded=1; \
            break; \
        fi; \
        echo "Falló la descarga o validación SHA-512; probando otro mirror."; \
        rm -f /tmp/apache-jmeter.tgz; \
    done; \
    if [ "${downloaded}" -ne 1 ]; then \
        echo 'ERROR: No se pudo descargar y verificar JMeter.' >&2; \
        exit 1; \
    fi; \
    tar -xzf /tmp/apache-jmeter.tgz -C /opt; \
    rm -f /tmp/apache-jmeter.tgz; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*; \
    mkdir -p /work/stress/reports; \
    chown -R 1000:1000 /work/stress

WORKDIR /work/stress

COPY --chown=1000:1000 plans/ ./plans/
