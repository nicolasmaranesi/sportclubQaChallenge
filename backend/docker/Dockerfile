
FROM node:22-alpine

RUN npm install -g \
    newman@6.2.2 \
    newman-reporter-htmlextra@1.23.1 \
    && npm cache clean --force

WORKDIR /work/backend

COPY --chown=node:node collections/ ./collections/
COPY --chown=node:node environments/ ./environments/

RUN mkdir -p reports \
    && chown -R node:node /work/backend

USER node

CMD set -u; \
    status=0; \
    for suite in auth-users products; do \
      echo "================================"; \
      echo "Ejecutando: ${suite}"; \
      echo "================================"; \
      set -- run "collections/${suite}.postman_collection.json" \
        -e "environments/sportclub.${TEST_ENV:-ci}.postman_environment.json" \
        --reporters cli,junit,htmlextra \
        --reporter-junit-export "reports/${suite}-results.xml" \
        --reporter-htmlextra-export "reports/${suite}-report.html"; \
      if [ -n "${BASE_URL:-}" ]; then \
        set -- "$@" --env-var "baseUrl=${BASE_URL}"; \
      fi; \
      if [ -n "${DUMMYJSON_USERNAME:-}" ]; then \
        set -- "$@" --env-var "username=${DUMMYJSON_USERNAME}"; \
      fi; \
      if [ -n "${DUMMYJSON_PASSWORD:-}" ]; then \
        set -- "$@" --env-var "password=${DUMMYJSON_PASSWORD}"; \
      fi; \
      newman "$@" || status=1; \
    done; \
    exit "$status"
