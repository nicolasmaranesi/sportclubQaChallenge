FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app


COPY package*.json ./
RUN npm install --include=dev --no-audit --no-fund \
    && node -e "const v=require('@playwright/test/package.json').version; if(v!=='1.64.1'){console.error('Playwright JS '+v+' != imagen v1.64.1');process.exit(1)}"

COPY playwright.config.ts ./
COPY e2e ./e2e
COPY src/pages ./src/pages

CMD ["./node_modules/.bin/playwright", "test", "--project=chromium"]
