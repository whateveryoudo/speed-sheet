// ============================================================
// @speed-sheet/shared — Core types, cell id helpers, constants
// ============================================================

export {
  CELL_ID_SEP,
  cellIdKey,
  parseCellIdKey,
  depKey,
  parseDepKey,
} from './cell-id'

export {
  ROW_ID_PREFIX,
  COL_ID_PREFIX,
  AXIS_NANOID_SIZE,
  AXIS_ID_PATTERN,
  allocRowId,
  allocColId,
  isRowId,
  isColId,
} from './axis-id'

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

/** 单元格附件（对齐知识库 attachment 上传结果） */
export interface CellAttachmentMeta {
  id: string
  fileName: string
  fileType?: string
  fileSize?: string | number
  previewUrl?: string
}

export interface CellAttributes extends CellStyle {
  v: string | number | boolean | null
  f?: string     // formula string, e.g. "=SUM(A1:A10)"
  m?: string     // display (monitor) value
  /** 公式错误码：ERROR | VALUE | NAME | REF | DIV0 | NA | NUM | NULL */
  ef?: string
  /** 公式错误悬停提示 */
  em?: string
  ct?: CellFormat
  qp?: number    // quote prefix
  /** 单元格内附件元数据 */
  att?: CellAttachmentMeta
}

/** 数据验证（对齐 Luckysheet dataVerification；复选框、下拉、链接、备注等） */
export type DataVerificationType = 'checkbox' | 'dropdown' | 'link' | 'note'

/** 单元格链接（对齐 Luckysheet hyperlink，存 dataVerification） */
export type CellLinkType = 'external' | 'internal'

export interface DropdownListOption {
  value: string
  /** 选项展示色（开启「颜色」时使用） */
  color?: string
}

export interface DataVerificationRule {
  type: DataVerificationType
  /** checkbox：是否勾选 */
  checked?: boolean
  /** checkbox 旁可选标签，写入单元格 m */
  label?: string
  /** dropdown：选项列表 */
  options?: DropdownListOption[]
  /** dropdown：是否多选 */
  multiSelect?: boolean
  /** dropdown：是否为选项着色 */
  useColor?: boolean
  /** dropdown：当前值（多选时为逗号拼接或 string[]） */
  value?: string | string[]
  /** link：链接类型 */
  linkType?: CellLinkType
  /** link：URL 或 Sheet!A1 */
  linkAddress?: string
  /** link：悬停提示 */
  linkTooltip?: string
  /** note：备注正文（仅空格也算有内容） */
  noteContent?: string
}

/** 备注是否有内容（空格也算） */
export function noteHasContent(content: string | undefined | null): boolean {
  return content != null && content.length > 0
}

export function dataVerificationKey(r: number, c: number): string {
  return `${r}_${c}`
}

/** 浮动图片（对齐 Luckysheet images，锚定单元格） */
export interface SheetImageItem {
  id: string
  src: string
  row: number
  col: number
  /** 当前/历史展示宽高（兼容旧数据；有 originWidth/Height 时渲染以原始尺寸自适应单元格） */
  width: number
  height: number
  /** 图片原始像素宽高，用于拖拽行列后按单元格等比缩放 */
  originWidth?: number
  originHeight?: number
  /** 相对单元格左上角的像素偏移 */
  offsetLeft?: number
  offsetTop?: number
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
  /** Display order → stable row ids */
  rowOrder: string[]
  /** Display order → stable col ids */
  colOrder: string[]
  /** Sparse cells keyed by `rowId:colId` */
  cells: Record<string, CellAttributes>
  config: SheetConfig
  /** 数据验证规则，键为 `row_col` */
  dataVerification?: Record<string, DataVerificationRule>
  /** 浮动图片 */
  images?: Record<string, SheetImageItem>
  /** 共享筛选（与 Y.Doc sheetFilter 一致） */
  sheetFilter?: unknown
  /** 私有筛选分桶（与 Y.Doc sheetFilterPrivate 一致） */
  sheetFilterPrivate?: Record<string, unknown>
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

// ----- Workbook UI config -----
export interface WorkbookConfig {
  lang?: 'zh' | 'en' | 'zh_tw' | 'es'
  /** v2 原生快照（推荐；Vue 组件 prop 名 `sheet-data`） */
  sheetData?: WorkbookSnapshot
  /** 变更回调，返回 WorkbookSnapshot */
  onChange?: (snapshot: WorkbookSnapshot) => void
  /** Luckysheet / Fortune Sheet 兼容格式（prop 名 `luckysheet-data`） */
  luckysheetData?: LuckysheetFile
  onLuckysheetChange?: (data: LuckysheetFile) => void
  /** @deprecated 请用 luckysheetData */
  data?: LuckysheetFile
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
