import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Minimal MPA config: list root HTML entries explicitly.
// Does not alter existing scripts; type="module" entries will be processed,
// other scripts are served as static assets.

export default defineConfig({
  root: 'frontend/apps/web',
  server: {
    port: 5173,
    open: false,
  },
  resolve: {
    alias: {
      '@src': resolve(__dirname, 'frontend/apps/web/src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'frontend/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'frontend/apps/web/index.html'),
        priceBoard: resolve(__dirname, 'frontend/apps/web/price-board.html'),
        screener: resolve(__dirname, 'frontend/apps/web/screener.html'),
        cafefRealtime: resolve(__dirname, 'frontend/apps/web/cafef-realtime.html'),
        industryDemo: resolve(__dirname, 'frontend/apps/web/industry-demo.html'),
        companyProfile: resolve(__dirname, 'frontend/apps/web/company-profile.html'),
        companyDirectory: resolve(__dirname, 'frontend/apps/web/company-directory.html'),
        apiDemo: resolve(__dirname, 'frontend/apps/web/api-demo.html'),
        algoList: resolve(__dirname, 'frontend/apps/web/algo-list.html'),
        algoDetail: resolve(__dirname, 'frontend/apps/web/algo-detail.html'),
        cp68Stable: resolve(__dirname, 'frontend/apps/web/cp68-stable.html'),
        fireantQuotes: resolve(__dirname, 'frontend/apps/web/fireant-quotes.html'),
        strategyBuilder: resolve(__dirname, 'frontend/apps/web/strategy-builder-component.html'),
      },
    },
  },
});
