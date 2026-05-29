import type { Sheet } from '../Sheet'
import type {
  CommandFn,
  CommandContext,
  CommandChain,
  ExtensionCommandContext,
  KeyboardShortcutHandler,
} from './types'

// ----- Extension Config -----
export interface ExtensionConfig<S = any> {
  name: string
  version?: string
  dependencies?: string[]
  priority?: number

  onInit?: (this: Extension<S>, sheet: Sheet) => void
  onDestroy?: () => void

  addCommands?: (this: Extension<S>, ctx: ExtensionCommandContext) => Record<string, CommandFn>
  addKeyboardShortcuts?: (
    this: Extension<S>,
    ctx: ExtensionCommandContext,
  ) => Record<string, KeyboardShortcutHandler>

  addStorage?: () => S
  addOptions?: () => Record<string, any>

  onCellChange?: (this: Extension<S>, r: number, c: number, newValue: any, oldValue: any) => void
  onSelectionChange?: (selection: any) => void
  onSheetSwitch?: (sheetId: string) => void

  addExtensions?: () => Extension[]
}

/** TipTap-style extension base class */
export class Extension<S = any> {
  public name: string
  public version: string
  public dependencies: string[]
  public priority: number
  public options: Record<string, any> = {}
  public storage: S = {} as S

  private config: ExtensionConfig<S>
  private parentExtension: Extension | null = null

  constructor(config: ExtensionConfig<S>) {
    this.name = config.name
    this.version = config.version ?? '0.1.0'
    this.dependencies = config.dependencies ?? []
    this.priority = config.priority ?? 0
    this.config = config
  }

  static create<S = any>(config: ExtensionConfig<S>): Extension<S> {
    return new Extension<S>(config)
  }

  extend<S2 = S>(overrides: Partial<ExtensionConfig<S2>>): Extension<S2> {
    const merged = {
      ...this.config,
      ...overrides,
      name: overrides.name ?? this.name,
      dependencies: [...new Set([...this.dependencies, ...(overrides.dependencies ?? [])])],
    } as ExtensionConfig<S2>

    const child = new Extension<S2>(merged)
    child.parentExtension = this
    return child
  }

  init(sheet: Sheet): void {
    if (this.config.addOptions) {
      this.options = this.config.addOptions()
    }
    if (this.config.addStorage) {
      this.storage = this.config.addStorage()
    }
    if (this.config.onInit) {
      this.config.onInit.call(this, sheet)
    }
  }

  destroy(): void {
    if (this.config.onDestroy) {
      this.config.onDestroy.call(this)
    }
  }

  getCommands(sheet: Sheet): Record<string, CommandFn> {
    if (this.config.addCommands) {
      return this.config.addCommands.call(this, { sheet })
    }
    return {}
  }

  getKeyboardShortcuts(sheet: Sheet): Record<string, KeyboardShortcutHandler> {
    if (this.config.addKeyboardShortcuts) {
      return this.config.addKeyboardShortcuts.call(this, { sheet })
    }
    return {}
  }

  getExtensions(): Extension[] {
    if (this.config.addExtensions) {
      return this.config.addExtensions()
    }
    return []
  }

  handleCellChange(r: number, c: number, newValue: any, oldValue: any): void {
    this.config.onCellChange?.call(this, r, c, newValue, oldValue)
  }

  handleSelectionChange(selection: any): void {
    this.config.onSelectionChange?.(selection)
  }

  handleSheetSwitch(sheetId: string): void {
    this.config.onSheetSwitch?.(sheetId)
  }

  get parent(): Extension | null {
    return this.parentExtension
  }
}

export type { CommandFn, CommandContext, CommandChain, ExtensionCommandContext, KeyboardShortcutHandler }
