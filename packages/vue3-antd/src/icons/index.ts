import autoFillSvg from './auto-fill.svg?raw'

let spriteInjected = false

/**
 * 确保内置 SVG 图标已注入到 DOM 的 SVG Sprite 中
 * 供 s-icon-font (:svg-sprite="true") 渲染使用
 */
export function ensureSvgSprite(): void {
  if (typeof document === 'undefined') return
  if (spriteInjected || document.getElementById('icon-auto-fill')) {
    spriteInjected = true
    return
  }

  let container = document.getElementById('__speed_sheet_svg_sprite__') as SVGSVGElement | null
  if (!container) {
    container = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    container.id = '__speed_sheet_svg_sprite__'
    container.setAttribute('style', 'display: none;')
    document.body.appendChild(container)
  }

  if (!container.querySelector('#icon-auto-fill')) {
    const svgMatch = autoFillSvg.match(/<svg[^>]*>(.*?)<\/svg>/s)
    const viewBoxMatch = autoFillSvg.match(/viewBox=["']([^"']+)["']/)
    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol')
    symbol.id = 'icon-auto-fill'
    symbol.setAttribute('viewBox', viewBoxMatch ? viewBoxMatch[1] : '0 0 1024 1024')
    symbol.innerHTML = svgMatch ? svgMatch[1] : ''
    container.appendChild(symbol)
  }

  spriteInjected = true
}
