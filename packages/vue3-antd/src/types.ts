import type { Extension, ExtensionConfig } from '@speed-sheet/core'
import type { LuckysheetFile, WorkbookSnapshot } from '@speed-sheet/shared'
import type * as Y from 'yjs'

/** SpeedSheet 组件 props（扁平声明，便于 vue-macros 解析） */
export interface SpeedSheetProps {
  lang?: 'zh' | 'en' | 'zh_tw' | 'es'
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
  snapshot?: WorkbookSnapshot
  extensions?: (Extension | ExtensionConfig)[]
  ydoc?: Y.Doc
}
