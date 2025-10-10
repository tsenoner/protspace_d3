import { fileURLToPath } from 'node:url';
import { dirname, resolve as pathResolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export const paths = {
  rootDir,
  coreIndex: pathResolve(rootDir, '../../packages/core/src/index.ts'),
  utilsIndex: pathResolve(rootDir, '../../packages/utils/src/index.ts'),
  indexHtml: pathResolve(rootDir, 'index.html'),
  debugHtml: pathResolve(rootDir, 'debug-visualization.html'),
};

export const aliases: Record<string, string> = {
  '@protspace/core': paths.coreIndex,
  '@protspace/utils': paths.utilsIndex,
};
