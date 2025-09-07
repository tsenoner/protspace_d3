import { defineConfig } from 'vite';
import { aliases } from './vite.paths';
import { htmlEntries } from './vite.entries';

// https://vitejs.dev/config/
export default defineConfig({
  // Set base path for GitHub Pages deployment
  base: process.env.NODE_ENV === 'production' ? '/protspace_d3/' : '/',
  resolve: {
    alias: aliases,
  },
  build: {
    rollupOptions: {
      input: htmlEntries,
    },
  },
  server: {
    port: 8081,
    open: true,
  },
});
