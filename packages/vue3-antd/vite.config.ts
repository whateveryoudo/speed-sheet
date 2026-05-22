import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SpeedSheetVue3Antd',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: [
        'vue',
        '@speed-sheet/core',
        '@speed-sheet/shared',
        '@speed-sheet/vue3',
        'ant-design-vue',
        '@ant-design/icons-vue',
      ],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
  resolve: {
    dedupe: ['vue'],
  },
})
