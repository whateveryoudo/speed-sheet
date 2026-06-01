import type { Extension, ExtensionConfig, Sheet } from '@speed-sheet/core'
import type { LuckysheetFile, Selection, WorkbookSnapshot } from '@speed-sheet/shared'
import type * as Y from 'yjs'

/** 右键命中区域（与 @speed-sheet/vue3 ContextMenuTarget 一致） */
export type ContextMenuTarget = 'cell' | 'range' | 'row' | 'column'

export interface ContextMenuActionContext {
  sheet: Sheet | null | undefined
  selection: Selection | undefined
  r: number
  c: number
  target?: ContextMenuTarget
  close: () => void
}

/**
 * 右键菜单项配置（对齐 tiptap ToolBarConfig 思路）
 * - string: 内置 key 或 '|' 分隔符
 * - object: 自定义项
 */
export type ContextMenuItemConfig =
  | string
  | {
      key: string
      title: string
      disabled?: boolean | ((ctx: ContextMenuActionContext) => boolean)
      action?: (ctx: ContextMenuActionContext) => void
    }

/** SpeedSheet 组件 props（扁平声明，便于 vue-macros 解析） */
export interface SpeedSheetProps {
  lang?: 'zh' | 'en'
  /** v2 原生快照（推荐） */
  sheetData?: WorkbookSnapshot
  /** 变更时返回 WorkbookSnapshot */
  onChange?: (snapshot: WorkbookSnapshot) => void
  /** Luckysheet 兼容导入（celldata / data） */
  luckysheetData?: LuckysheetFile
  /** 需要 Luckysheet 形态回调时注册 */
  onLuckysheetChange?: (data: LuckysheetFile) => void
  /** @deprecated 请用 luckysheetData */
  data?: LuckysheetFile
  column?: number
  row?: number
  showToolbar?: boolean
  /** 工具栏项；未传则用默认内置项，'|' 为分隔符 */
  toolbarKeys?: import('./menus/toolbar/types').ToolbarItemConfig[]
  /** @deprecated 请用 toolbarKeys */
  toolbarItems?: string[]
  /** 从默认工具栏排除的 key（与 toolbarKeys 同时传时仅 toolbarKeys 生效） */
  excludeToolbarKeys?: string[]
  /**
   * 左上角插入菜单项（'|' 为分隔符；默认对齐语雀：复选框/下拉/图链附注/公式）
   * @see defaultInsertMenuKeys
   */
  insertMenuKeys?: import('./menus/insert/types').InsertMenuItemConfig[]
  /** 插入菜单：includeKeys / excludeKeys / items / groups 覆盖 */
  insertMenuConfig?: import('./menus/insert/types').InsertMenuConfig
  showSheetTabs?: boolean
  devicePixelRatio?: number
  /** 单元格右键菜单项；未传则用默认内置项 */
  cellContextMenu?: ContextMenuItemConfig[]
  /** 从默认菜单排除的 key（与 cellContextMenu 同时传时仅 cellContextMenu 生效） */
  excludeContextMenuKeys?: string[]
  /** 工作表页签菜单；未传则用默认（删除/重命名/副本等） */
  sheetTabContextMenu?: import('./menus/sheetTabMenu/types').SheetTabMenuItemConfig[]
  excludeSheetTabMenuKeys?: string[]
  rowHeaderWidth?: number
  columnHeaderHeight?: number
  showFormulaBar?: boolean
  defaultFontSize?: number
  extensions?: (Extension | ExtensionConfig)[]
  ydoc?: Y.Doc
  /** 是否可编辑；false 为查看态（同一套渲染，屏蔽写入类交互） */
  editable?: boolean
  /** 覆盖 App 级 upload（一般无需传，在 app.use(SpeedSheetUi) 配置） */
  upload?: import('@speed-sheet/vue3').SheetUploadConfig
}
