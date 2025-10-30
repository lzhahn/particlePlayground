import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/particlePlayground/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'es2020',
  },
});
