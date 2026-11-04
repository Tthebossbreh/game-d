import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: {
    host: true,
  },
  build: {
    target: 'es2022',
    // Keep the public/ assets separate from Vite's own bundle output.
    assetsDir: 'bundled',
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
