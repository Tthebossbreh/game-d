import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const LEVEL_PATH = fileURLToPath(new URL('./src/game/levels/level1.json', import.meta.url));

/**
 * Dev-only endpoint that lets the standalone level editor write straight to
 * src/game/levels/level1.json. A production build has no server, so the editor
 * falls back to downloading the JSON file instead.
 */
function editorSavePlugin(): Plugin {
  return {
    name: 'underwater-editor-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__editor/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf8');
        });
        req.on('end', () => {
          try {
            const parsed: unknown = JSON.parse(body);
            writeFile(LEVEL_PATH, JSON.stringify(parsed), 'utf8')
              .then(() => {
                res.statusCode = 200;
                res.end('saved');
              })
              .catch((error: unknown) => {
                res.statusCode = 500;
                res.end(String(error));
              });
          } catch (error) {
            res.statusCode = 400;
            res.end(String(error));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [editorSavePlugin()],
  server: {
    host: true,
  },
  build: {
    target: 'es2022',
    // Keep the public/ assets separate from Vite's own bundle output.
    assetsDir: 'bundled',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        editor: fileURLToPath(new URL('./editor.html', import.meta.url)),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
