/**
 * Shared tsup preset for headless TS libraries (@speed-sheet/core, shared, extensions).
 * Vue/React UI packages keep Vite; pure .ts entry libs use this instead of Vite.
 */
import { defineConfig, type Options } from 'tsup'

export function createLibConfig(overrides: Options = {}): Options {
  return {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: {
      resolve: true,
    },
    tsconfig: 'tsconfig.json',
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: 'es2020',
    ...overrides,
  }
}

export function defineLibConfig(overrides: Options = {}) {
  return defineConfig(createLibConfig(overrides))
}
