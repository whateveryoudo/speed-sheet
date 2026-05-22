import * as Y from 'yjs'
import type { LuckysheetFile, SheetSnapshot, WorkbookSnapshot } from '@speed-sheet/shared'
import { Extension, CORE_EXTENSIONS } from './extension'
import type { ExtensionConfig, CommandChain } from './extension'
import { CommandManager } from './commands/CommandManager'
import { SheetState } from './state/SheetState'
import { importFromLuckysheet, exportToLuckysheet } from './adapter/luckysheet-adapter'

// ============================================================
// Sheet — Headless spreadsheet editor (TipTap's Editor pattern)
// ============================================================

export interface SheetOptions {
  /** Mount target (if using vanilla rendering, otherwise null for headless) */
  container?: string | HTMLElement

  /** Extensions to load */
  extensions?: (Extension | ExtensionConfig)[]

  /** Initial data — Luckysheet format (auto-converted via adapter) */
  data?: LuckysheetFile

  /** Initial data — native snapshot */
  snapshot?: WorkbookSnapshot

  /** External Y.Doc for collaborative editing */
  ydoc?: Y.Doc

  /** Called after any state mutation */
  onUpdate?: (sheet: Sheet) => void
}

export class Sheet {
  public ydoc: Y.Doc
  public state!: SheetState
  public commands!: CommandManager
  public extensions: Extension[] = []
  public options: SheetOptions

  private _isDestroyed = false

  constructor(options: SheetOptions = {}) {
    this.options = options

    // Yjs document — shared or fresh
    this.ydoc = options.ydoc ?? new Y.Doc()

    // Initialize
    this._initExtensions(options)
    this._initData(options)
    this._initCommands()

    options.onUpdate?.(this)
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
    if (options.data) {
      // Luckysheet compatibility path
      importFromLuckysheet(options.data, this.ydoc)
    } else if (options.snapshot) {
      this._loadSnapshot(options.snapshot)
    } else {
      // Empty workbook with one sheet
      const sheetsMap = this.ydoc.getMap('sheets')
      const sheet0 = new Y.Map()
      sheet0.set('name', 'Sheet1')
      sheetsMap.set('0', sheet0)
    }

    // Bind state to first sheet (or an active one)
    const sheetsMap = this.ydoc.getMap('sheets')
    const firstId = Array.from(sheetsMap.keys())[0] ?? '0'
    const firstSheet = sheetsMap.get(firstId) as Y.Map<any>

    if (firstSheet) {
      this.state = new SheetState(firstSheet)
    } else {
      this.state = new SheetState(new Y.Map())
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
    this.ydoc.transact(() => {
      for (const sheetSnap of snapshot.sheets) {
        const ySheet = new Y.Map()
        ySheet.set('name', sheetSnap.name)

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

  /** Switch to a different sheet */
  switchSheet(sheetId: string): void {
    const sheetsMap = this.ydoc.getMap('sheets')
    const ySheet = sheetsMap.get(sheetId) as Y.Map<any>
    if (!ySheet) {
      console.warn(`[@speed-sheet/core] Sheet "${sheetId}" not found`)
      return
    }
    this.state = new SheetState(ySheet)
    for (const ext of this.extensions) {
      ext.handleSheetSwitch(sheetId)
    }
  }

  /** Get all sheet IDs */
  getSheetIds(): string[] {
    return Array.from(this.ydoc.getMap('sheets').keys())
  }

  /** Get sheet name */
  getSheetName(sheetId?: string): string {
    if (sheetId) {
      const sheetsMap = this.ydoc.getMap('sheets')
      const ySheet = sheetsMap.get(sheetId) as Y.Map<any>
      return ySheet?.get('name') ?? ''
    }
    return this.state.root.get('name') ?? ''
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

  /** Trigger update callback (called by CommandManager after mutations) */
  notifyUpdate(): void {
    this.options.onUpdate?.(this)
  }

  /** Destroy the sheet instance */
  destroy(): void {
    if (this._isDestroyed) return
    this._isDestroyed = true

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
