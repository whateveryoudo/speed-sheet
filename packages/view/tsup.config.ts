import { defineLibConfig } from '../../tools/tsup.lib'

export default defineLibConfig({
  format: ['esm', 'cjs'],
  external: ['@speed-sheet/core', '@speed-sheet/extension-protection', '@speed-sheet/shared'],
})
