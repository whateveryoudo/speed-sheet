import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/headless.ts'),
      name: 'SpeedSheetVue3',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['vue', '@speed-sheet/core', '@speed-sheet/shared', 'yjs'],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
  resolve: {
    dedupe: ['vue'],
  },
})
