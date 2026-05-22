/**
 * Shared tsup preset for headless TS libraries (core extensions, shared types).
 * Prefer this over per-package vite.config for packages that only contain .ts entry files.
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
