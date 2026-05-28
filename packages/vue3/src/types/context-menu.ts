import type { ContextMenuTarget as CoreContextMenuTarget } from '@speed-sheet/core'

/** @deprecated Prefer importing from `@speed-sheet/core` */
export type ContextMenuTarget = CoreContextMenuTarget

/** 右键菜单 slot / emit 上下文（headless，不含 UI） */
export interface ContextMenuState {
  r: number
  c: number
  /** 相对视口的 client 坐标，供 @floating-ui/dom 定位 */
  clientX: number
  clientY: number
  target: ContextMenuTarget
}

export type ContextMenuCloseFn = () => void
