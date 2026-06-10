import type { CellAttributes, DataVerificationRule, MergeRange, Selection, SheetImageItem } from '@speed-sheet/shared'
import type { MergeContext } from '../../merge'
import type { GridLayout } from '../grid-layout'

export interface CellEntry {
  r: number
  c: number
  data: CellAttributes
}

export interface RenderOptions {
  layout: GridLayout
  cells: CellEntry[]
  /** @deprecated 使用 mergeCtx */
  merges?: MergeRange[]
  /** 合并门面（优先于 merges） */
  mergeCtx?: MergeContext
  selection: Selection
  /** 正在拖拽框选（范围细框；锚点仍为粗框） */
  isSelecting?: boolean
  /** 正在内联编辑的单元格（不再在 canvas 上描活动格边框，避免与 input 双边框） */
  editingCell?: { r: number; c: number }
  /** 复制/剪切后的虚线框区域 */
  clipboardRange?: { row: [number, number]; column: [number, number] } | null
  /** 公式编辑时引用的单元格/区域（虚线框，按 color 区分） */
  formulaRefRanges?: Array<{
    row: [number, number]
    column: [number, number]
    color: string
  }>
  /** 数据验证（复选框等），键 `row_col` */
  dataVerifications?: Map<string, DataVerificationRule>
  /** 本地筛选视图（标记 + 数据区框选） */
  filterView?: import('../../Sheet').FilterViewState | null
  /** 浮动图片（canvas 绘制，位于网格之上、表头/分割线之下） */
  images?: SheetImageItem[]
  /** 图片异步加载完成后请求重绘 */
  onImageLoaded?: () => void
}

export type CellMap = Map<string, CellAttributes>

export interface DrawCellTextOptions {
  /** 横向占用的列数（含当前列），默认 1 */
  colSpan?: number
  /** 超出 clip 宽时是否用省略号截断；默认 false（纯 clip） */
  truncate?: boolean
}
