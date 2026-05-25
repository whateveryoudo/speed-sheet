import { defineLibConfig } from '../../tools/tsup.lib'

export default defineLibConfig({
  format: ['esm', 'cjs'],
  external: ['yjs', '@speed-sheet/shared'],
})
