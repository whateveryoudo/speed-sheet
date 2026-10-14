import { ref, type Ref } from 'vue'

export type ResizeHandleDirection = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l'

export interface BoxRect {
  left: number
  top: number
  width: number
  height: number
}

export interface UseBoxResizeOptions {
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  keepAspectRatio?: boolean
  onResizeStart?: (handle: ResizeHandleDirection, startRect: BoxRect) => void
  onResizing?: (newRect: BoxRect, handle: ResizeHandleDirection) => void
  onResizeEnd?: (finalRect: BoxRect, handle: ResizeHandleDirection) => void
}

export interface UseBoxResizeReturn {
  isResizing: Ref<boolean>
  activeHandle: Ref<ResizeHandleDirection | null>
  startResize: (handle: ResizeHandleDirection, startRect: BoxRect, startEvent: MouseEvent) => void
}

/**
 * 通用 8 向 DOM 元素拖拽缩放 Hook
 * 支持 4 个角（对角双向）和 4 条边（单向拉伸），自动约束最小/最大宽高
 */
export function useBoxResize(options: UseBoxResizeOptions = {}): UseBoxResizeReturn {
  const isResizing = ref(false)
  const activeHandle = ref<ResizeHandleDirection | null>(null)

  function startResize(handle: ResizeHandleDirection, startRect: BoxRect, startEvent: MouseEvent) {
    startEvent.stopPropagation()
    startEvent.preventDefault()

    const startX = startEvent.clientX
    const startY = startEvent.clientY
    const origLeft = startRect.left
    const origTop = startRect.top
    const origW = startRect.width
    const origH = startRect.height

    const minW = options.minWidth ?? 50
    const minH = options.minHeight ?? 50
    const maxW = options.maxWidth ?? Infinity
    const maxH = options.maxHeight ?? Infinity

    isResizing.value = true
    activeHandle.value = handle
    options.onResizeStart?.(handle, startRect)

    let currentRect: BoxRect = { ...startRect }

    function onMouseMove(event: MouseEvent) {
      const dx = event.clientX - startX
      const dy = event.clientY - startY

      let newLeft = origLeft
      let newTop = origTop
      let newW = origW
      let newH = origH

      // 水平方向
      if (handle.includes('r')) {
        newW = Math.max(minW, Math.min(maxW, origW + dx))
      } else if (handle.includes('l')) {
        const targetW = origW - dx
        if (targetW < minW) {
          newW = minW
          newLeft = origLeft + (origW - minW)
        } else if (targetW > maxW) {
          newW = maxW
          newLeft = origLeft + (origW - maxW)
        } else {
          newW = targetW
          newLeft = origLeft + dx
        }
      }

      // 垂直方向
      if (handle.includes('b')) {
        newH = Math.max(minH, Math.min(maxH, origH + dy))
      } else if (handle.includes('t')) {
        const targetH = origH - dy
        if (targetH < minH) {
          newH = minH
          newTop = origTop + (origH - minH)
        } else if (targetH > maxH) {
          newH = maxH
          newTop = origTop + (origH - maxH)
        } else {
          newH = targetH
          newTop = origTop + dy
        }
      }

      // 锁定宽高比（可选）
      if (options.keepAspectRatio && origW > 0 && origH > 0) {
        const ratio = origW / origH
        if (handle === 'l' || handle === 'r') {
          newH = newW / ratio
        } else if (handle === 't' || handle === 'b') {
          newW = newH * ratio
        } else {
          if (Math.abs(dx) > Math.abs(dy)) {
            newH = newW / ratio
          } else {
            newW = newH * ratio
          }
        }
      }

      currentRect = { left: newLeft, top: newTop, width: newW, height: newH }
      options.onResizing?.(currentRect, handle)
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      isResizing.value = false
      activeHandle.value = null
      options.onResizeEnd?.(currentRect, handle)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return {
    isResizing,
    activeHandle,
    startResize,
  }
}
