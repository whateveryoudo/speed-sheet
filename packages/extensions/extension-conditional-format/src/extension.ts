import { Extension, type CommandContext, type Sheet } from '@speed-sheet/core'
import { writeCfRulesToYdoc } from './persist'
import { applyCfFromYdoc, bindCfYdocSync } from './sync-ydoc'
import { normalizeRect } from './range'
import {
  CF_EXTENSION_NAME,
  type CfRule,
  type ConditionalFormatExtensionStorage,
} from './types'

function createId(): string {
  return `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function persistRules(state: CommandContext['state'], rules: CfRule[]): void {
  writeCfRulesToYdoc(state, rules)
}

function rebind(sheet: Sheet, storage: ConditionalFormatExtensionStorage): void {
  storage._unbindYdoc?.()
  storage._unbindYdoc = bindCfYdocSync(sheet, storage)
}

export const ConditionalFormatExtension = Extension.create<ConditionalFormatExtensionStorage>({
  name: CF_EXTENSION_NAME,
  priority: -36,

  addStorage() {
    return {
      rules: [],
      _activeSheetId: '0',
      _sheet: null,
      _unbindYdoc: null,
    }
  },

  onInit(sheet: Sheet) {
    const storage = this.storage
    storage._sheet = sheet
    storage._activeSheetId = sheet.getActiveSheetId()
    queueMicrotask(() => {
      if (storage._sheet !== sheet) return
      rebind(sheet, storage)
    })
  },

  onDestroy(this: Extension<ConditionalFormatExtensionStorage>) {
    this.storage._unbindYdoc?.()
    this.storage._unbindYdoc = null
    this.storage._sheet = null
  },

  onSheetSwitch(this: Extension<ConditionalFormatExtensionStorage>, sheetId: string) {
    const storage = this.storage
    storage._activeSheetId = sheetId
    storage.rules = []
    const sheet = storage._sheet
    if (sheet) rebind(sheet, storage)
  },

  addCommands() {
    const storage = this.storage

    return {
      addCfRule: (props: Omit<CfRule, 'id'> & { id?: string }) => {
        return ({ state }: CommandContext) => {
          const { r0, r1, c0, c1 } = normalizeRect(props.row, props.column)
          const rule: CfRule = {
            ...props,
            id: props.id ?? createId(),
            row: [r0, r1],
            column: [c0, c1],
          }
          storage.rules = [...storage.rules, rule]
          persistRules(state, storage.rules)
          return true
        }
      },

      updateCfRule: (props: CfRule) => {
        return ({ state }: CommandContext) => {
          const idx = storage.rules.findIndex((r) => r.id === props.id)
          if (idx < 0) return false
          const { r0, r1, c0, c1 } = normalizeRect(props.row, props.column)
          const next = [...storage.rules]
          next[idx] = { ...props, row: [r0, r1], column: [c0, c1] }
          storage.rules = next
          persistRules(state, storage.rules)
          return true
        }
      },

      removeCfRule: (props: { id: string }) => {
        return ({ state }: CommandContext) => {
          const next = storage.rules.filter((r) => r.id !== props.id)
          if (next.length === storage.rules.length) return false
          storage.rules = next
          persistRules(state, storage.rules)
          return true
        }
      },

      clearCfRules: () => {
        return ({ state }: CommandContext) => {
          if (!storage.rules.length) return false
          storage.rules = []
          persistRules(state, [])
          return true
        }
      },
    }
  },
})

export function getCfExtensionStorage(
  sheet: { extensions: Extension[] },
): ConditionalFormatExtensionStorage | null {
  const ext = sheet.extensions.find((e) => e.name === CF_EXTENSION_NAME)
  if (!ext) return null
  return ext.storage as ConditionalFormatExtensionStorage
}

export function getCfRules(sheet: { extensions: Extension[] }): CfRule[] {
  return getCfExtensionStorage(sheet)?.rules ?? []
}
