import type { InjectionKey, Ref } from 'vue'
import type { GridLayout, GridMetrics, Sheet } from '@speed-sheet/core'
import type { CellAttributes } from '@speed-sheet/shared'

export interface SheetViewportSnapshot {
  layout: GridLayout
  scrollX: number
  scrollY: number
  gridMetrics: GridMetrics
}

export interface SheetToolbarContext {
  sheet: Ref<Sheet | null | undefined>
  /** 与 useSheet.revision 同步，驱动工具栏读取 sheet.state */
  revision: Ref<number>
  /** 是否可编辑（查看态为 false） */
  editable: Ref<boolean>
  formatPainterActive: Ref<boolean>
  copiedStyle: Ref<Partial<CellAttributes> | null>
  findReplaceOpen: Ref<boolean>
  /** 读取画布当前滚动与布局，供冻结等工具栏做视口校验 */
  getViewportState?: () => SheetViewportSnapshot | null
}

export const SHEET_TOOLBAR_KEY: InjectionKey<SheetToolbarContext> =
  Symbol('sheetToolbar')
