import { autoUpdate, computePosition, flip, offset, shift, type VirtualElement } from '@floating-ui/dom'
import { nextTick, onUnmounted, ref, watch, type Ref } from 'vue'

export interface SheetBubbleAnchorRect {
  left: number
  top: number
  width: number
  height: number
}

function virtualAnchorFromRect(
  rect: SheetBubbleAnchorRect,
  boundaryEl: HTMLElement,
): VirtualElement {
  const b = boundaryEl.getBoundingClientRect()
  const left = b.left + rect.left
  const top = b.top + rect.top
  const width = rect.width
  const height = rect.height
  return {
    getBoundingClientRect: () => ({
      x: left,
      y: top,
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    }),
  }
}

/**
 * 表格气泡定位（对标 tiptap BubbleMenu 插件 + floating-ui，锚点为选中的浮动层矩形）。
 */
export function useSheetBubbleFloating(options: {
  anchorRect: Ref<SheetBubbleAnchorRect | null>
  shouldShow: () => boolean
  boundary: Ref<HTMLElement | null | undefined>
  placement?: 'top' | 'bottom' | 'top-start' | 'bottom-start'
  /** floating-ui offset，默认 8；贴单元格时可设 2 */
  offset?: number
}) {
  const visible = ref(false)
  const menuEl = ref<HTMLElement | null>(null)
  let cleanupAutoUpdate: (() => void) | null = null

  const placement = options.placement ?? 'bottom'
  const offsetPx = options.offset ?? 8

  async function updatePosition(): Promise<void> {
    const el = menuEl.value
    const rect = options.anchorRect.value
    const boundary = options.boundary.value
    if (!el || !rect || !boundary) return

    const { x, y } = await computePosition(virtualAnchorFromRect(rect, boundary), el, {
      placement,
      strategy: 'absolute',
      middleware: [offset(offsetPx), flip({ boundary }), shift({ boundary, padding: 8 })],
    })

    Object.assign(el.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: '6',
    })
  }

  function teardown(): void {
    cleanupAutoUpdate?.()
    cleanupAutoUpdate = null
  }

  async function syncVisible(): Promise<void> {
    const show = options.shouldShow() && !!options.anchorRect.value && !!options.boundary.value
    visible.value = show
    if (!show) {
      teardown()
      return
    }
    await nextTick()
    await updatePosition()
    const el = menuEl.value
    const rect = options.anchorRect.value
    const boundary = options.boundary.value
    if (!el || !rect || !boundary) return
    teardown()
    cleanupAutoUpdate = autoUpdate(
      virtualAnchorFromRect(rect, boundary),
      el,
      updatePosition,
    )
  }

  watch(
    () => [options.anchorRect.value, options.boundary.value, options.shouldShow()] as const,
    () => {
      void syncVisible()
    },
    { deep: true },
  )

  onUnmounted(teardown)

  return { visible, menuEl, updatePosition, syncVisible }
}
