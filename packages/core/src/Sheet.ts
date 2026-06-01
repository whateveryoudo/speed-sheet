import * as Y from 'yjs'
import type { LuckysheetFile, MergeRange, SheetSnapshot, WorkbookSnapshot } from '@speed-sheet/shared'
import type { MergeContext } from './merge'
import { Extension, CORE_EXTENSIONS } from './extension'
import type { ExtensionConfig, CommandChain } from './extension'
import { CommandManager } from './commands/CommandManager'
import { SheetState } from './state/SheetState'
import { importFromLuckysheet, exportToLuckysheet } from './adapter/luckysheet-adapter'
import type { ClipboardPayload } from './extension/core/clipboard'
import { sheetCompatApi, type LuckysheetRange } from './api/sheet-compat'
import { canRedoSheet, canUndoSheet, getSheetUndoManager } from './yjs/undo-manager'
import { transactSystem, transactUser } from './yjs/transact'
import { YOriginUser } from './yjs/origins'

export type { LuckysheetRange } from './api/sheet-compat'

// ============================================================
// Sheet — Headless spreadsheet editor (TipTap's Editor pattern)
// ============================================================

export interface SheetOptions {
  /** Mount target (if using vanilla rendering, otherwise null for headless) */
  container?: string | HTMLElement

  /** Extensions to load */
  extensions?: (Extension | ExtensionConfig)[]

  /** Initial data — native v2 snapshot (preferred) */
  snapshot?: WorkbookSnapshot

  /** Initial data — Luckysheet format (import via adapter) */
  data?: LuckysheetFile

  /** External Y.Doc for collaborative editing */
  ydoc?: Y.Doc

  /** Called after any state mutation */
  onUpdate?: (sheet: Sheet) => void

  /** 插删行列前：提交进行中的单元格/公式编辑（此时 A1 坐标仍与网格一致） */
  onBeforeLayoutChange?: (sheet: Sheet) => void

  /** 插删行列等结构变更后（公式重算已完成）：关闭公式编辑 UI 等 */
  onLayoutChange?: (sheet: Sheet) => void
}

export class Sheet {
  public ydoc: Y.Doc
  public state!: SheetState
  public commands!: CommandManager
  public extensions: Extension[] = []
  public options: SheetOptions

  private _isDestroyed = false
  private _activeSheetId = '0'
  /** 外部 ydoc 协同：远程事务到达时刷新 UI */
  private _collabUpdateHandler: ((update: Uint8Array, origin: unknown) => void) | null = null

  constructor(options: SheetOptions = {}) {
    this.options = options

    // Yjs document — shared or fresh
    this.ydoc = options.ydoc ?? new Y.Doc()

    // Initialize
    this._initExtensions(options)
    this._initData(options)
    this._initCommands()
    this._initCollabSync()

    options.onUpdate?.(this)
  }

  /** 订阅共享 Y.Doc 的远程变更，驱动 revision / 画布重绘 */
  private _initCollabSync(): void {
    if (!this.options.ydoc) return

    this._collabUpdateHandler = (_update, origin) => {
      if (origin === YOriginUser) return
      this.notifyUpdate()
    }
    this.ydoc.on('update', this._collabUpdateHandler)
  }

  private _teardownCollabSync(): void {
    if (this._collabUpdateHandler) {
      this.ydoc.off('update', this._collabUpdateHandler)
      this._collabUpdateHandler = null
    }
  }

  // ---- Initialization ----

  private _initExtensions(options: SheetOptions): void {
    // 1. Load core extensions
    const extensions: Extension[] = [...CORE_EXTENSIONS]

    // 2. Resolve user extensions
    if (options.extensions) {
      for (const ext of options.extensions) {
        if (ext instanceof Extension) {
          extensions.push(ext)
        } else {
          extensions.push(new Extension(ext))
        }
      }
    }

    // 3. Flatten dependency tree (each extension can declare addExtensions())
    const resolved = this._resolveExtensionTree(extensions)

    // 4. Sort by priority (descending)
    resolved.sort((a, b) => a.priority - b.priority)

    // 5. Init all
    for (const ext of resolved) {
      ext.init(this)
    }

    this.extensions = resolved
  }

  /** Recursively resolve extensions and their dependencies */
  private _resolveExtensionTree(extensions: Extension[]): Extension[] {
    const seen = new Set<string>()
    const result: Extension[] = []

    const walk = (ext: Extension) => {
      if (seen.has(ext.name)) return
      seen.add(ext.name)

      const children = ext.getExtensions()
      for (const child of children) {
        walk(child)
      }

      result.push(ext)
    }

    for (const ext of extensions) {
      walk(ext)
    }

    return result
  }

  private _initData(options: SheetOptions): void {
    if (options.snapshot) {
      this._loadSnapshot(options.snapshot)
    } else if (options.data) {
      importFromLuckysheet(options.data, this.ydoc)
    } else {
      const sheetsMap = this.ydoc.getMap('sheets')
      if (sheetsMap.size === 0) {
        const sheet0 = new Y.Map()
        sheet0.set('name', 'Sheet1')
        sheetsMap.set('0', sheet0)
      }
    }

    // Bind state to first sheet (or an active one)
    const sheetsMap = this.ydoc.getMap('sheets')
    const firstId = Array.from(sheetsMap.keys())[0] ?? '0'
    const firstSheet = sheetsMap.get(firstId) as Y.Map<any>

    if (firstSheet) {
      this.state = new SheetState(firstSheet)
      this._activeSheetId = firstId
    } else {
      this.state = new SheetState(new Y.Map())
      this._activeSheetId = '0'
    }
  }

  private _initCommands(): void {
    this.commands = new CommandManager(this)
    for (const ext of this.extensions) {
      this.commands.registerExtension(ext)
    }
  }

  private _loadSnapshot(snapshot: WorkbookSnapshot): void {
    const sheetsMap = this.ydoc.getMap('sheets')
    transactSystem(this.ydoc, () => {
      for (const sheetSnap of snapshot.sheets) {
        const ySheet = new Y.Map()
        ySheet.set('name', sheetSnap.name)

        const rowOrder = new Y.Array<string>()
        rowOrder.insert(0, sheetSnap.rowOrder)
        ySheet.set('rowOrder', rowOrder)

        const colOrder = new Y.Array<string>()
        colOrder.insert(0, sheetSnap.colOrder)
        ySheet.set('colOrder', colOrder)

        const meta = new Y.Map<unknown>()
        meta.set('rowCount', sheetSnap.rowOrder.length)
        meta.set('colCount', sheetSnap.colOrder.length)
        ySheet.set('meta', meta)

        const cells = new Y.Map()
        for (const [key, attrs] of Object.entries(sheetSnap.cells)) {
          const cellMap = new Y.Map()
          for (const [k, v] of Object.entries(attrs)) {
            if (v !== null && v !== undefined) {
              cellMap.set(k, v as any)
            }
          }
          cells.set(key, cellMap)
        }
        ySheet.set('cells', cells)

        // Config
        if (sheetSnap.config) {
          ySheet.set('merges', objectToYMap(sheetSnap.config.merges))
          ySheet.set('rowHeight', objectToYMap(sheetSnap.config.rowHeight))
          ySheet.set('colWidth', objectToYMap(sheetSnap.config.colWidth))
          ySheet.set('rowHidden', objectToYMap(sheetSnap.config.rowHidden))
          ySheet.set('colHidden', objectToYMap(sheetSnap.config.colHidden))
        }
        if (sheetSnap.dataVerification) {
          ySheet.set('dataVerification', objectToYMap(sheetSnap.dataVerification))
        }
        if (sheetSnap.images) {
          ySheet.set('images', objectToYMap(sheetSnap.images))
        }

        sheetsMap.set(sheetSnap.id, ySheet)
      }
    })
  }

  // ---- Public API ----

  /** Chainable command execution */
  chain(): CommandChain {
    return this.commands.chain()
  }

  /** Check if a command can execute */
  can(): CommandChain {
    return this.commands.can()
  }

  /** Get the Y.Doc for external sync (e.g. y-websocket) */
  getYDoc(): Y.Doc {
    return this.ydoc
  }

  /** 新建工作表并切换到该表，返回新 sheet id */
  addSheet(name?: string): string {
    const sheetsMap = this.ydoc.getMap('sheets')
    const id = this._nextSheetId()
    const displayName = name ?? this._defaultNewSheetName()

    transactUser(this.ydoc, () => {
      const ySheet = new Y.Map()
      ySheet.set('name', displayName)
      sheetsMap.set(id, ySheet)
    })

    this.switchSheet(id)
    return id
  }

  private _nextSheetId(): string {
    const keys = this.getSheetIds()
    let n = 0
    while (keys.includes(String(n))) n++
    return String(n)
  }

  private _defaultNewSheetName(): string {
    const n = this.getSheetIds().length
    return `Sheet${n}`
  }

  /** Switch to a different sheet */
  switchSheet(sheetId: string): void {
    const sheetsMap = this.ydoc.getMap('sheets')
    const ySheet = sheetsMap.get(sheetId) as Y.Map<any>
    if (!ySheet) {
      console.warn(`[@speed-sheet/core] Sheet "${sheetId}" not found`)
      return
    }
    this.state = new SheetState(ySheet)
    this._activeSheetId = sheetId
    for (const ext of this.extensions) {
      ext.handleSheetSwitch(sheetId)
    }
    this.notifyUpdate()
  }

  /** 当前激活的工作表 id */
  getActiveSheetId(): string {
    return this._activeSheetId
  }

  /** Get all sheet IDs */
  getSheetIds(): string[] {
    return Array.from(this.ydoc.getMap('sheets').keys())
  }

  /** 未隐藏的工作表 id（页签栏展示，顺序与内部 sheets Map 一致） */
  getVisibleSheetIds(): string[] {
    const sheetsMap = this.ydoc.getMap('sheets')
    return this.getSheetIds().filter((id) => {
      const ySheet = sheetsMap.get(id) as Y.Map<any>
      return !ySheet?.get('hidden')
    })
  }

  /** 调整工作表顺序（页签拖拽）；orderedIds 为可见表顺序，隐藏表保留在末尾 */
  reorderSheets(orderedIds: string[]): void {
    const sheetsMap = this.ydoc.getMap('sheets')
    const all = this.getSheetIds()
    const hidden = all.filter((id) => {
      const ySheet = sheetsMap.get(id) as Y.Map<any>
      return !!ySheet?.get('hidden')
    })
    const visibleSet = new Set(orderedIds)
    const trailing = all.filter((id) => !visibleSet.has(id) && !hidden.includes(id))
    const fullOrder = [...orderedIds, ...hidden, ...trailing]

    transactUser(this.ydoc, () => {
      const snapshot: Array<[string, Y.Map<any>]> = []
      const seen = new Set<string>()
      for (const id of fullOrder) {
        const v = sheetsMap.get(id) as Y.Map<any> | undefined
        if (v) {
          snapshot.push([id, v])
          seen.add(id)
        }
      }
      for (const id of all) {
        if (!seen.has(id)) {
          const v = sheetsMap.get(id) as Y.Map<any> | undefined
          if (v) snapshot.push([id, v])
        }
      }
      for (const k of [...sheetsMap.keys()]) sheetsMap.delete(k)
      for (const [k, v] of snapshot) sheetsMap.set(k, v)
    })
    this.notifyUpdate()
  }

  renameSheet(sheetId: string, name: string): void {
    const ySheet = this.ydoc.getMap('sheets').get(sheetId) as Y.Map<any>
    if (!ySheet) return
    transactUser(this.ydoc, () => ySheet.set('name', name))
    this.notifyUpdate()
  }

  deleteSheet(sheetId: string): void {
    const ids = this.getSheetIds()
    if (ids.length <= 1) {
      console.warn('[@speed-sheet/core] Cannot delete the last sheet')
      return
    }
    const sheetsMap = this.ydoc.getMap('sheets')
    transactUser(this.ydoc, () => sheetsMap.delete(sheetId))
    if (this._activeSheetId === sheetId) {
      const next = ids.find((id) => id !== sheetId) ?? '0'
      this.switchSheet(next)
    } else {
      this.notifyUpdate()
    }
  }

  duplicateSheet(sheetId: string): string {
    const sheetsMap = this.ydoc.getMap('sheets')
    const source = sheetsMap.get(sheetId) as Y.Map<any>
    if (!source) return sheetId
    const id = this._nextSheetId()
    const baseName = (source.get('name') as string) || 'Sheet'
    transactUser(this.ydoc, () => {
      const clone = cloneYSheetMap(source)
      clone.set('name', `${baseName} 副本`)
      sheetsMap.set(id, clone)
    })
    this.switchSheet(id)
    return id
  }

  setSheetHidden(sheetId: string, hidden: boolean): void {
    const ySheet = this.ydoc.getMap('sheets').get(sheetId) as Y.Map<any>
    if (!ySheet) return
    transactUser(this.ydoc, () => {
      if (hidden) ySheet.set('hidden', 1)
      else ySheet.delete('hidden')
    })
    if (hidden && this._activeSheetId === sheetId) {
      const visible = this.getVisibleSheetIds()
      if (visible.length) this.switchSheet(visible[0])
      else this.notifyUpdate()
    } else {
      this.notifyUpdate()
    }
  }

  setSheetTabColor(sheetId: string, color: string | null): void {
    const ySheet = this.ydoc.getMap('sheets').get(sheetId) as Y.Map<any>
    if (!ySheet) return
    transactUser(this.ydoc, () => {
      if (color) ySheet.set('color', color)
      else ySheet.delete('color')
    })
    this.notifyUpdate()
  }

  getSheetTabColor(sheetId: string): string | null {
    const ySheet = this.ydoc.getMap('sheets').get(sheetId) as Y.Map<any>
    return (ySheet?.get('color') as string) ?? null
  }

  /** Get sheet name */
  getSheetName(sheetId?: string): string {
    if (sheetId) {
      const sheetsMap = this.ydoc.getMap('sheets')
      const ySheet = sheetsMap.get(sheetId) as Y.Map<any>
      return ySheet?.get('name') ?? ''
    }
    return (this.state.root.get('name') as string | undefined) ?? ''
  }

  /** Export to native snapshot */
  toSnapshot(): WorkbookSnapshot {
    const sheetsMap = this.ydoc.getMap('sheets')
    const sheets: SheetSnapshot[] = []

    sheetsMap.forEach((value, id) => {
      const ySheet = value as Y.Map<any>
      const state = new SheetState(ySheet)
      sheets.push(state.toSnapshot(id, ySheet.get('name') ?? ''))
    })

    return {
      version: 2,
      sheets,
      activeSheetId: sheets[0]?.id ?? '0',
    }
  }

  /** Export to Luckysheet-compatible format */
  toLuckysheetFile(): LuckysheetFile {
    return exportToLuckysheet(this.ydoc)
  }

  /** Whether local undo stack has items (toolbar / shortcuts). */
  canUndo(): boolean {
    return canUndoSheet(this)
  }

  canRedo(): boolean {
    return canRedoSheet(this)
  }

  /** End merge window for rapid edits (e.g. before formula ref pick). */
  stopHistoryCapture(): void {
    getSheetUndoManager(this)?.stopCapturing()
  }

  /** Trigger update callback (called by CommandManager after mutations) */
  notifyUpdate(): void {
    this.options.onUpdate?.(this)
  }

  notifyBeforeLayoutChange(): void {
    this.options.onBeforeLayoutChange?.(this)
  }

  notifyLayoutChange(): void {
    this.options.onLayoutChange?.(this)
    this.notifyUpdate()
  }

  // ---- Luckysheet 风格便捷 API（内部仍走 chain） ----

  getRange(): LuckysheetRange[] {
    return sheetCompatApi.getRange(this)
  }

  getRangeValue(range?: LuckysheetRange): (string | number | null)[][] {
    return sheetCompatApi.getRangeValue(this, range)
  }

  setRangeValue(data: (string | number | null)[][], range?: LuckysheetRange): void {
    sheetCompatApi.setRangeValue(this, data, range)
  }

  getCellValue(r: number, c: number): string | number | null {
    return sheetCompatApi.getCellValue(this, r, c)
  }

  setCellValue(r: number, c: number, value: string | number): void {
    sheetCompatApi.setCellValue(this, r, c, value)
  }

  setRange(range: LuckysheetRange): void {
    sheetCompatApi.setRange(this, range)
  }

  clearRange(range?: LuckysheetRange): void {
    sheetCompatApi.clearRange(this, range)
  }

  insertRow(row?: number, count?: number): void {
    sheetCompatApi.insertRow(this, row, count)
  }

  deleteRow(row?: number, count?: number): void {
    sheetCompatApi.deleteRow(this, row, count)
  }

  insertColumn(col?: number, count?: number): void {
    sheetCompatApi.insertColumn(this, col, count)
  }

  deleteColumn(col?: number, count?: number): void {
    sheetCompatApi.deleteColumn(this, col, count)
  }

  copy(): void {
    sheetCompatApi.copy(this)
  }

  cut(): void {
    sheetCompatApi.cut(this)
  }

  paste(): void {
    sheetCompatApi.paste(this)
  }

  /** 当前工作表上的合并区域 */
  getMergeRanges(): MergeRange[] {
    return this.state.getMergeRanges()
  }

  /** 合并单元格统一门面（读写/命中/表头/绘制） */
  createMergeContext(): MergeContext {
    return this.state.createMergeContext()
  }

  /** 复制/剪切后的虚线选区（无则 null） */
  getClipboardRange(): { row: [number, number]; column: [number, number] } | null {
    const ext = this.extensions.find((e) => e.name === 'clipboard')
    const copied = (ext?.storage as { copied?: ClipboardPayload | null })?.copied
    if (!copied) return null
    return { row: copied.row, column: copied.column }
  }

  /** Destroy the sheet instance */
  destroy(): void {
    if (this._isDestroyed) return
    this._isDestroyed = true

    this._teardownCollabSync()

    for (const ext of this.extensions) {
      ext.destroy()
    }
    this.extensions = []

    if (!this.options.ydoc) {
      // We own the Y.Doc, destroy it (yjs Doc.destroy exists at runtime)
      ;(this.ydoc as Y.Doc & { destroy(): void }).destroy()
    }
  }

  get isDestroyed(): boolean {
    return this._isDestroyed
  }
}

// ---- Helpers ----

function objectToYMap(obj: Record<string, any> | undefined): Y.Map<any> {
  const map = new Y.Map()
  if (obj) {
    for (const [k, v] of Object.entries(obj)) {
      map.set(k, v)
    }
  }
  return map
}

function cloneYSheetMap(source: Y.Map<any>): Y.Map<any> {
  const target = new Y.Map()
  source.forEach((value, key) => {
    if (value instanceof Y.Map) {
      const nested = new Y.Map()
      value.forEach((v, k) => {
        if (v instanceof Y.Map) {
          const cell = new Y.Map()
          v.forEach((cv, ck) => cell.set(ck, cv))
          nested.set(k, cell)
        } else {
          nested.set(k, v)
        }
      })
      target.set(key, nested)
    } else {
      target.set(key, value)
    }
  })
  return target
}
