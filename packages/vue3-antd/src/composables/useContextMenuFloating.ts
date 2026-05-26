import { nextTick, onUnmounted, ref, type Ref } from 'vue'
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type VirtualElement,
} from '@floating-ui/dom'

/** 点击这些浮层时不视为“点外部”，避免菜单提前关闭 */
const OUTSIDE_CLICK_IGNORE_SELECTORS = [
  '.ant-dropdown',
  '.ant-popover',
  '.ant-tooltip',
  '.ant-modal',
  '.ant-menu-submenu-popup',
  '.ant-select-dropdown',
  '.color-picker-popover',
  '.color-board-popover-wrapper',
  '.sheet-tab-color-submenu-popup',
].join(', ')

export interface UseContextMenuFloatingOptions {
  boundary?: Ref<HTMLElement | null | undefined>
  placement?: 'bottom-start' | 'right-start' | 'top-start'
  /** 额外浮层选择器，点击时不关闭菜单 */
  ignoreOutsideSelectors?: string
}

function virtualPoint(x: number, y: number): VirtualElement {
  return {
    getBoundingClientRect: () => ({
      x,
      y,
      width: 0,
      height: 0,
      top: y,
      left: x,
      right: x,
      bottom: y,
    }),
  }
}

/** 右键菜单定位（@floating-ui/dom，对齐 tiptap useFloatingPopup 思路） */
export function useContextMenuFloating(options: UseContextMenuFloatingOptions = {}) {
  const visible = ref(false)
  const menuEl = ref<HTMLElement | null>(null)
  const anchor = ref<{ x: number; y: number } | null>(null)

  let cleanupAutoUpdate: (() => void) | null = null
  let removeOutsideClick: (() => void) | null = null

  const placement = options.placement ?? 'bottom-start'

  async function updatePosition(): Promise<void> {
    const el = menuEl.value
    const pt = anchor.value
    if (!el || !pt) return

    const boundary = options.boundary?.value ?? document.body
    const { x, y } = await computePosition(virtualPoint(pt.x, pt.y), el, {
      placement,
      strategy: 'fixed',
      middleware: [
        offset(4),
        flip({ boundary }),
        shift({ boundary, padding: 8 }),
      ],
    })

    Object.assign(el.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: '1000',
    })
  }

  function   bindOutsideClick(): void {
    removeOutsideClick?.()
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) return
      const el = menuEl.value
      if (!el || el.contains(e.target as Node)) return
      const ignoreSelectors = options.ignoreOutsideSelectors
        ? `${OUTSIDE_CLICK_IGNORE_SELECTORS}, ${options.ignoreOutsideSelectors}`
        : OUTSIDE_CLICK_IGNORE_SELECTORS
      if ((e.target as Element).closest(ignoreSelectors)) return
      close()
    }
    document.addEventListener('mousedown', onMouseDown, true)
    removeOutsideClick = () =>
      document.removeEventListener('mousedown', onMouseDown, true)
  }

  function teardownAutoUpdate(): void {
    cleanupAutoUpdate?.()
    cleanupAutoUpdate = null
  }

  async function openAt(clientX: number, clientY: number): Promise<void> {
    anchor.value = { x: clientX, y: clientY }
    visible.value = true
    bindOutsideClick()
    await nextTick()
    await updatePosition()
    const el = menuEl.value
    const pt = anchor.value
    if (el && pt) {
      teardownAutoUpdate()
      cleanupAutoUpdate = autoUpdate(
        virtualPoint(pt.x, pt.y),
        el,
        updatePosition,
      )
    }
  }

  function close(): void {
    visible.value = false
    anchor.value = null
    teardownAutoUpdate()
    removeOutsideClick?.()
    removeOutsideClick = null
  }

  onUnmounted(close)

  return {
    visible,
    menuEl,
    openAt,
    close,
    updatePosition,
  }
}
