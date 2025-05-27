import { defineConfig } from 'vite';
import path from 'path'; // Import path module

// https://vitejs.dev/config/
export default defineConfig({
  // No special config needed for basic Lit/TS and workspace linking usually.
  // Vite's dev server will serve index.html from the root of this example package.
  // It will resolve workspace dependencies like @protspace/core and @protspace/utils.
  resolve: {
    alias: {
      '@protspace/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@protspace/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
    },
  },
  server: {
    port: 8081, // So it doesn't clash with other examples or the main app
    open: true, // Automatically open in browser
  }
}); 