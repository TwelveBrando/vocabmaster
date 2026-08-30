import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const appRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

export default defineConfig({
  root: appRoot,
  plugins: [react(), tailwindcss()],
  base: '/',
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:3001' }, fs: { allow: ['../..'] } },
  build: { outDir: resolve(appRoot, 'web/client/dist'), emptyOutDir: true },
});
