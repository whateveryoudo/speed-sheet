import type { SheetImageItem } from '@speed-sheet/shared'
import { cellInFreezePane } from './freeze-panes'
import { computeSheetImageViewportRect } from './sheet-image-layout'
import type { RenderEnv } from './render-env'

const imageCache = new Map<string, HTMLImageElement>()

function getOrLoadImage(src: string, onLoaded?: () => void): HTMLImageElement | null {
  let img = imageCache.get(src)
  if (!img) {
    img = new Image()
    img.decoding = 'async'
    img.onload = () => onLoaded?.()
    img.onerror = () => {}
    img.src = src
    imageCache.set(src, img)
  }
  if (!img.complete || img.naturalWidth <= 0) return null
  return img
}

export function drawSheetImages(env: RenderEnv): void {
  const images = env.options.images
  if (!images?.length) return

  const { ctx, M, layout, mc, vw, vh, freezePane, options } = env
  const onLoaded = options.onImageLoaded

  for (const img of images) {
    if (!cellInFreezePane(img.row, img.col, freezePane, layout)) continue

    const rect = computeSheetImageViewportRect(layout, M, mc, img)
    if (
      rect.left + rect.width <= 0 ||
      rect.left >= vw ||
      rect.top + rect.height <= 0 ||
      rect.top >= vh
    ) {
      continue
    }

    const el = getOrLoadImage(img.src, onLoaded)
    if (!el) continue

    ctx.drawImage(el, rect.left, rect.top, rect.width, rect.height)
  }
}

/** 测试或切换 sheet 时可清缓存 */
export function clearSheetImageCache(src?: string): void {
  if (src) {
    imageCache.delete(src)
    return
  }
  imageCache.clear()
}

export type { SheetImageItem }
