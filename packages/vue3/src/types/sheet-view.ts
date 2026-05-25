import type { Sheet } from '@speed-sheet/core'
import type { CellAttributes, Selection } from '@speed-sheet/shared'

/** 驱动 canvas 渲染的视图状态（由 useSheet 维护） */
export interface SheetViewState {
  sheet: Sheet | null
  selection: Selection
  cells: Array<{ r: number; c: number; data: CellAttributes }>
  /** 每次 sheet 变更递增，用于触发重绘（含剪贴板虚线等非 cells 状态） */
  revision: number
  rowHeaderWidth?: number
  columnHeaderHeight?: number
}

/** 公式栏 / 页签 / 工具栏 slot 等外壳配置 */
export interface SheetChromeOptions {
  showToolbar?: boolean
  showSheetBar?: boolean
  showFormulaBar?: boolean
  sheetNames?: string[]
  activeSheetName?: string
}
