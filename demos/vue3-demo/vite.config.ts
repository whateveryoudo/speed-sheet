import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  // Dev: always use package source (avoid stale dist with old canvas layout)
  resolve: {
    alias: {
      '@speed-sheet/vue3-antd': resolve(__dirname, '../../packages/vue3-antd/src/index.ts'),
      '@speed-sheet/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@speed-sheet/vue3': resolve(__dirname, '../../packages/vue3/src/index.ts'),
      '@speed-sheet/core': resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['yjs', 'lib0'],
  },
  server: {
    port: 4000,
  },
})
