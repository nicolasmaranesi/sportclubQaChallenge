FROM node:22-bookworm-slim
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY mobile/src ./mobile/src
COPY mobile/tests ./mobile/tests
ENV CI=true
CMD ["sh", "-ec", "mkdir -p mobile/reports && npx vitest run mobile/tests/sedes.unit.test.ts --reporter=default --reporter=junit --outputFile.junit=mobile/reports/unit-results.xml"]
