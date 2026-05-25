// ============================================================
// @speed-sheet/shared — Core types, cell key helpers, constants
// ============================================================

// ----- Cell Key encoding -----
// Encode: "R{row}_C{col}" — unambiguous, sortable, regex-parseable
export function cellKey(r: number, c: number): string {
  return `R${r}_C${c}`
}

export function rowKey(r: number): string {
  return `R${r}`
}

export function colKey(c: number): string {
  return `C${c}`
}

const CELL_KEY_RE = /^R(\d+)_C(\d+)$/
const ROW_KEY_RE = /^R(\d+)$/
const COL_KEY_RE = /^C(\d+)$/

export function parseCellKey(key: string): { r: number; c: number } | null {
  const m = key.match(CELL_KEY_RE)
  if (!m) return null
  return { r: parseInt(m[1], 10), c: parseInt(m[2], 10) }
}

export function parseRowKey(key: string): number | null {
  const m = key.match(ROW_KEY_RE)
  if (!m) return null
  return parseInt(m[1], 10)
}

export function parseColKey(key: string): number | null {
  const m = key.match(COL_KEY_RE)
  if (!m) return null
  return parseInt(m[1], 10)
}

// ----- Cell Value Types -----
export interface CellStyle {
  fc?: string   // font color
  bg?: string   // background color
  bl?: number   // bold: 0 or 1
  ff?: string   // font family
  fs?: number   // font size
  it?: number   // italic
  un?: number   // underline: 0 or 1
  vt?: number   // vertical align (0=middle, 1=top, 2=bottom)
  ht?: number   // horizontal align (0=center, 1=left, 2=right)
  tr?: number   // text rotation
  tb?: number   // text break / wrap
}

export interface CellFormat {
  fa: string    // format string, e.g. "General", "@", "0.00"
  t: 's' | 'n' | 'b' | 'd'  // type: string, number, boolean, date
}

export interface CellAttributes extends CellStyle {
  v: string | number | boolean | null
  f?: string     // formula string, e.g. "=SUM(A1:A10)"
  m?: string     // display (monitor) value
  ct?: CellFormat
  qp?: number    // quote prefix
}

// ----- Sheet config -----
export interface MergeRange {
  r: number     // start row
  c: number     // start col
  rs: number    // row span
  cs: number    // col span
}

export interface BorderSegment {
  style: number
  color: string
}

export interface BorderInfo {
  row_index: number
  col_index: number
  l?: BorderSegment
  r?: BorderSegment
  t?: BorderSegment
  b?: BorderSegment
}

export interface FilterCriteria {
  column: number
  type: 'value' | 'condition' | 'top10'
  values?: string[]
  condition?: string
}

export interface FreezeState {
  xSplit: number
  ySplit: number
}

export interface SheetConfig {
  merges: Record<string, MergeRange>
  rowHeight: Record<string, number>
  colWidth: Record<string, number>
  rowHidden: Record<string, number>
  colHidden: Record<string, number>
  borders: BorderInfo[]
  filters: FilterCriteria[]
  freeze?: FreezeState
}

// ----- Sheet / Workbook Snapshots (serialisable) -----
export interface SheetSnapshot {
  id: string
  name: string
  order: number
  cells: Record<string, CellAttributes>
  config: SheetConfig
}

export interface WorkbookSnapshot {
  version: number
  sheets: SheetSnapshot[]
  activeSheetId: string
}

// ----- Luckysheet Compatibility Types -----
export interface LuckysheetCell {
  r: number
  c: number
  v: string | number | boolean | CellAttributes | null
}

export interface LuckysheetSheet {
  name: string
  index: number
  order?: number
  status?: string
  hide?: number
  row?: number
  column?: number
  data?: (CellAttributes | string | number | null)[][]
  celldata?: LuckysheetCell[]
  config?: Partial<{
    merge: Record<string, MergeRange>
    rowlen: Record<string, number>
    columnlen: Record<string, number>
    rowhidden: Record<string, number>
    colhidden: Record<string, number>
    borderInfo: BorderInfo[]
    filter: { row: number[]; column: number[] }
    freezen: Record<string, number>
  }>
}

export type LuckysheetFile = LuckysheetSheet[]

// ----- Event types -----
export interface Selection {
  row: [number, number]
  column: [number, number]
  /** 选区锚点（拖拽起点 / 当前活动单元格），默认 row[0], column[0] */
  anchor?: { r: number; c: number }
}

// ----- Workbook UI config (Fortune Sheet / Luckysheet 对齐) -----
/** @see https://ruilisi.github.io/fortune-sheet-docs/zh/guide/config.html */
export interface WorkbookConfig {
  lang?: 'zh' | 'en' | 'zh_tw' | 'es'
  /**
   * 工作簿数据（推荐用 sheetData；勿用 prop 名 `data`，Vue 下容易传不进来）
   * Fortune Sheet 文档里的 `data` 对应此字段。
   */
  sheetData?: LuckysheetFile
  /** @deprecated 请用 sheetData */
  data?: LuckysheetFile
  onChange?: (data: LuckysheetFile) => void
  column?: number
  row?: number
  showToolbar?: boolean
  toolbarItems?: string[]
  showSheetTabs?: boolean
  devicePixelRatio?: number
  cellContextMenu?: string[]
  sheetTabContextMenu?: string[]
  rowHeaderWidth?: number
  columnHeaderHeight?: number
  showFormulaBar?: boolean
  defaultFontSize?: number
}

// ----- Extension metadata -----
export interface ExtensionMeta {
  name: string
  version?: string
  dependencies?: string[]
}
