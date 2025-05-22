import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts']
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@protspace/core'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@protspace/core': 'ProtspaceCore'
        }
      }
    }
  }
});