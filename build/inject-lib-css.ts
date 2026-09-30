import type { Plugin } from 'vite'

/** Vite lib 模式会把 CSS 抽成独立文件，但不会写进 JS 入口；此插件在产物里补上 side-effect import */
export function injectLibCss(): Plugin {
  return {
    name: 'inject-lib-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const cssAssetPath = Object.keys(bundle).find((name) => name.endsWith('.css'))
      if (!cssAssetPath) return

      const cssImportPath = `./${cssAssetPath.split('/').pop()}`

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue
        if (fileName !== 'index.js' && fileName !== 'index.cjs') continue
        if (chunk.code.includes(cssImportPath)) continue

        const prefix = fileName.endsWith('.cjs')
          ? `require("${cssImportPath}");\n`
          : `import "${cssImportPath}";\n`
        chunk.code = prefix + chunk.code
      }
    },
  }
}
