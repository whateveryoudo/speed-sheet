import type { Plugin } from 'vite'
import { readdirSync, readFileSync, statSync, watch } from 'fs'
import { resolve, join, extname, basename } from 'path'

export interface SimpleSvgSpriteOptions {
  iconDirs: string[]
  symbolId?: (name: string, dir?: string) => string
  customDomId?: string
}

export function createSimpleSvgSpritePlugin(options: SimpleSvgSpriteOptions): Plugin {
  const {
    iconDirs,
    symbolId,
    customDomId = '__svg__icons__',
  } = options

  const getId = symbolId || ((name: string) => `icon-${name}`)

  let svgSpriteContent = ''
  let watchers: Array<{ close: () => void }> = []

  // 收集所有 SVG 文件
  const collectSvgFiles = (): Array<{ path: string; name: string; dir?: string }> => {
    const svgFiles: Array<{ path: string; name: string; dir?: string }> = []

    iconDirs.forEach(dir => {
      const fullDir = resolve(process.cwd(), dir)
      try {
        if (!statSync(fullDir).isDirectory()) return
      } catch {
        return
      }

      const files = readdirSync(fullDir, { recursive: true })
      files.forEach(file => {
        const fullPath = join(fullDir, String(file))
        try {
          if (statSync(fullPath).isFile() && extname(fullPath) === '.svg') {
            const relativePath = String(file).replace(/\\/g, '/')
            const name = basename(relativePath, '.svg')
            const dirName = relativePath.includes('/')
              ? relativePath.split('/')[0]
              : undefined
            svgFiles.push({ path: fullPath, name, dir: dirName })
          }
        } catch {
          // ignore
        }
      })
    })

    return svgFiles
  }

  // 生成 SVG sprite
  const generateSprite = () => {
    const svgFiles = collectSvgFiles()
    const symbols: string[] = []

    svgFiles.forEach(({ path, name, dir }) => {
      let content = readFileSync(path, 'utf-8')

      const svgMatch = content.match(/<svg[^>]*>(.*?)<\/svg>/s)
      if (!svgMatch) return

      const innerContent = svgMatch[1]
      const viewBoxMatch = content.match(/viewBox=["']([^"']+)["']/)
      const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24'

      const id = getId(name, dir)

      symbols.push(
        `<symbol id="${id}" viewBox="${viewBox}">${innerContent}</symbol>`
      )
    })

    svgSpriteContent = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;" id="${customDomId}">\n${symbols.join('\n')}\n</svg>`
  }

  return {
    name: 'simple-svg-sprite',
    buildStart() {
      generateSprite()

      // 开发模式下监听文件变化
      if (process.env.NODE_ENV !== 'production') {
        iconDirs.forEach(dir => {
          const fullDir = resolve(process.cwd(), dir)
          try {
            if (!statSync(fullDir).isDirectory()) return
          } catch {
            return
          }

          const watcher = watch(fullDir, { recursive: true }, (eventType, filename) => {
            if (filename && extname(filename) === '.svg') {
              generateSprite()
            }
          })

          watchers.push(watcher)
        })
      }
    },

    transformIndexHtml(html) {
      if (svgSpriteContent) {
        return html.replace(
          '<head>',
          `<head>\n${svgSpriteContent}`
        )
      }
      return html
    },

    buildEnd() {
      watchers.forEach(watcher => watcher.close())
      watchers = []
    },

    resolveId(id) {
      if (id === 'virtual:svg-sprite') return id
      return null
    },

    load(id) {
      if (id === 'virtual:svg-sprite') {
        return `export default ${JSON.stringify(svgSpriteContent)}`
      }
      return null
    }
  }
}
