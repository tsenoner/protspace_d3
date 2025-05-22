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
      external: ['lit', 'd3'],
      output: {
        globals: {
          lit: 'Lit',
          d3: 'D3'
        }
      }
    }
  }
});