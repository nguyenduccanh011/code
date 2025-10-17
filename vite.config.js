import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Minimal MPA config: list root HTML entries explicitly.
// Does not alter existing scripts; type="module" entries will be processed,
// other scripts are served as static assets.

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: false,
  },
  resolve: {
    alias: {
      '@src': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        priceBoard: resolve(__dirname, 'price-board.html'),
        screener: resolve(__dirname, 'screener.html'),
        cafefRealtime: resolve(__dirname, 'cafef-realtime.html'),
        industryDemo: resolve(__dirname, 'industry-demo.html'),
        companyProfile: resolve(__dirname, 'company-profile.html'),
        companyDirectory: resolve(__dirname, 'company-directory.html'),
        apiDemo: resolve(__dirname, 'api-demo.html'),
        algoList: resolve(__dirname, 'algo-list.html'),
        algoDetail: resolve(__dirname, 'algo-detail.html'),
        cp68Stable: resolve(__dirname, 'cp68-stable.html'),
        fireantQuotes: resolve(__dirname, 'fireant-quotes.html'),
      },
    },
  },
});

