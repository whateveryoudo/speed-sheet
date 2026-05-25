/** 右键菜单 slot / emit 上下文（headless，不含 UI） */
export interface ContextMenuState {
  r: number
  c: number
  /** 相对视口的 client 坐标，供 @floating-ui/dom 定位 */
  clientX: number
  clientY: number
}

export type ContextMenuCloseFn = () => void
