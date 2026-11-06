
FROM eclipse-temurin:17-jre-jammy

ARG JMETER_VERSION=5.6.3

ENV JMETER_HOME=/opt/apache-jmeter-${JMETER_VERSION} \
    PATH=/opt/apache-jmeter-${JMETER_VERSION}/bin:${PATH} \
    JAVA_TOOL_OPTIONS=-Djava.awt.headless=true

# Instalar JMeter y dependencias
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates curl fonts-dejavu-core \
    && curl -fL --retry 3 --connect-timeout 20 \
       "https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz" \
       -o /tmp/apache-jmeter.tgz \
    && tar -xzf /tmp/apache-jmeter.tgz -C /opt \
    && rm /tmp/apache-jmeter.tgz \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /work/stress/reports \
    && chown -R 1000:1000 /work/stress

WORKDIR /work/stress

# Copiar plan 
COPY --chown=1000:1000 plans/ ./plans/
