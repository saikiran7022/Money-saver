/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Static SPA, no backend. Base is relative so the built site works from any
// static host (including project-style GitHub Pages paths).
export default defineConfig({
  base: './',
  plugins: [react()],
  // pdfjs-dist and tesseract.js ship large workers/wasm; keep them out of the
  // dependency pre-bundling that can choke on worker imports.
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
