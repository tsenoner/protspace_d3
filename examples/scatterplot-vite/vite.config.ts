import { defineConfig } from 'vite';
import { aliases } from './vite.paths';
import { htmlEntries } from './vite.entries';

// https://vitejs.dev/config/
export default defineConfig({
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
