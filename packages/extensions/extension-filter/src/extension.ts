import { Extension, type CommandContext, type Sheet } from '@speed-sheet/core'
import type { Selection } from '@speed-sheet/shared'
import { computeHiddenRows, buildInitialColumnRules } from './evaluate'
import { filterMarkerRow, syncSheetFilterView } from './filter-view'
import {
  clearFilterFromYdoc,
  clearPrivateFilterFromYdoc,
  writeFilterSessionToYdoc,
} from './persist'
import {
  clearCurrentUserPrivateFilter,
  persistPrivateFilterToYdoc,
} from './private-ydoc'
import { filterScopeToSelection, resolveFilterScope } from './range'
import { applyEffectiveFilterView, bindFilterYdocSync } from './sync-ydoc'
import {
  FILTER_EXTENSION_NAME,
  type FilterExtensionStorage,
  type FilterSession,
  type FilterColumnRule,
} from './types'
import { getUserIdFromExtension, getUserIdFromStorage } from './user-id'

function rebindFilterYdocSync(sheet: Sheet, storage: FilterExtensionStorage): void {
  storage._unbindYdoc?.()
  storage._unbindYdoc = bindFilterYdocSync(sheet, storage)
}

function syncSharedFilterToYdoc(state: CommandContext['state'], session: FilterSession | null): void {
  if (!session || !session.active || !session.visibleToAll) {
    clearFilterFromYdoc(state)
    return
  }
  writeFilterSessionToYdoc(state, session)
}

export const FilterExtension = Extension.create<FilterExtensionStorage>({
  name: FILTER_EXTENSION_NAME,
  priority: -40,

  addOptions() {
    return {
      /** 业务注入：返回当前登录用户 id */
      getCurrentUserId: (): string | null => null,
    }
  },

  addStorage() {
    return {
      session: null,
      hiddenRows: new Set<number>(),
      _activeSheetId: '0',
      _sheet: null as Sheet | null,
      _unbindYdoc: null as (() => void) | null,
      _getUserId: undefined,
    }
  },

  onInit(sheet: Sheet) {
    const storage = this.storage
    storage._sheet = sheet
    storage._activeSheetId = sheet.getActiveSheetId()
    storage._getUserId = () => getUserIdFromExtension(this)
    // Sheet.state 在 _initData 之后才就绪，延后绑定 Y.Doc observer
    queueMicrotask(() => {
      if (storage._sheet !== sheet) return
      rebindFilterYdocSync(sheet, storage)
    })
  },

  onDestroy(this: Extension<FilterExtensionStorage>) {
    this.storage._unbindYdoc?.()
    this.storage._unbindYdoc = null
  },

  onSheetSwitch(this: Extension<FilterExtensionStorage>, sheetId: string) {
    const storage = this.storage
    const sheet = storage._sheet
    storage._activeSheetId = sheetId
    storage.session = null
    storage.hiddenRows = new Set()
    if (sheet) {
      sheet.setFilterView(null)
      rebindFilterYdocSync(sheet, storage)
    }
  },

  onCellChange(this: Extension<FilterExtensionStorage>) {
    const session = this.storage.session
    const sheet = this.storage._sheet
    if (!session?.active || !sheet) return
    this.storage.hiddenRows = computeHiddenRows(sheet.state, session)
    syncSheetFilterView(sheet, this.storage)
    if (session.visibleToAll) {
      writeFilterSessionToYdoc(sheet.state, session)
    } else {
      persistPrivateFilterToYdoc(sheet, this.storage)
    }
  },

  addCommands({ sheet }) {
    const storage = this.storage

    return {
      prepareFilterFromSelection: () => {
        return ({ state }: CommandContext) => {
          const prevVisibleToAll = storage.session?.visibleToAll ?? false
          if (storage.session) {
            storage.session = null
            storage.hiddenRows = new Set()
            sheet.setFilterView(null)
          }
          const sel = state.getSelection()
          const scope = resolveFilterScope(state, sel)
          if (!scope.columns.length) return false
          if (!scope.singleCell) {
            state.setSelection(filterScopeToSelection(scope))
          }
          const columnRules = buildInitialColumnRules(state, scope)
          storage.session = {
            active: false,
            ...scope,
            columnRules,
            visibleToAll: prevVisibleToAll,
          }
          syncSheetFilterView(sheet, storage)
          return true
        }
      },

      applyFilterSession: (session: FilterSession) => {
        return ({ state }: CommandContext) => {
          storage.session = { ...session, active: true }
          const isRangeScope =
            session.singleCell === false ||
            (session.singleCell == null && session.headerRow != null)
          if (isRangeScope) {
            state.setSelection(
              filterScopeToSelection({
                columns: session.columns,
                dataStartRow: session.dataStartRow,
                dataEndRow: session.dataEndRow,
                headerRow: session.headerRow,
                rangeLabel: session.rangeLabel,
                singleCell: false,
              }),
            )
          }
          storage.hiddenRows = computeHiddenRows(state, storage.session)
          syncSheetFilterView(sheet, storage)
          syncSharedFilterToYdoc(state, storage.session)
          if (storage.session.visibleToAll) {
            // 共享筛选：不写删其他用户 privateFilters[userId]
          } else {
            persistPrivateFilterToYdoc(sheet, storage)
          }
          return true
        }
      },

      updateFilterColumnContent: (props: { column: number; selectedValues: string[] }) => {
        return ({ state }: CommandContext) => {
          const session = storage.session
          if (!session) return false
          const rule = session.columnRules.find((r: FilterColumnRule) => r.column === props.column)
          if (!rule) return false
          rule.content = { mode: 'content', selectedValues: [...props.selectedValues] }
          if (session.active) {
            storage.hiddenRows = computeHiddenRows(state, session)
            syncSheetFilterView(sheet, storage)
            if (session.visibleToAll) {
              writeFilterSessionToYdoc(state, session)
            } else {
              persistPrivateFilterToYdoc(sheet, storage)
            }
          }
          return true
        }
      },

      dismissFilterPanel: () => {
        return () => {
          if (storage.session && !storage.session.active) {
            storage.session = null
            syncSheetFilterView(sheet, storage)
          }
          return true
        }
      },

      clearFilter: () => {
        return ({ state }: CommandContext) => {
          const session = storage.session
          if (session?.visibleToAll) {
            clearFilterFromYdoc(state)
          } else if (session?.active) {
            clearPrivateFilterFromYdoc(state, getUserIdFromStorage(storage))
          } else {
            clearFilterFromYdoc(state)
            clearPrivateFilterFromYdoc(state, getUserIdFromStorage(storage))
          }
          applyEffectiveFilterView(sheet, storage)
          return true
        }
      },
    }
  },
})

export function getFilterExtensionStorage(sheet: { extensions: Extension[] }): FilterExtensionStorage | null {
  const ext = sheet.extensions.find((e) => e.name === FILTER_EXTENSION_NAME)
  if (!ext) return null
  return ext.storage as FilterExtensionStorage
}

export function getFilterSession(sheet: { extensions: Extension[] }): FilterSession | null {
  return getFilterExtensionStorage(sheet)?.session ?? null
}

export function isFilterActive(sheet: { extensions: Extension[] }): boolean {
  return !!getFilterSession(sheet)?.active
}

export function hasFilterSession(sheet: { extensions: Extension[] }): boolean {
  return !!getFilterSession(sheet)
}

export function getFilterMarkerRow(session: FilterSession): number {
  return filterMarkerRow(session)
}

export function isFilterHeaderCell(
  sheet: { extensions: Extension[] },
  r: number,
  c: number,
): boolean {
  const session = getFilterSession(sheet)
  if (!session) return false
  return session.columns.includes(c) && r === filterMarkerRow(session)
}

type FilterSheet = {
  chain: () => {
    prepareFilterFromSelection: () => { run: () => void }
    clearFilter: () => { run: () => void }
    dismissFilterPanel: () => { run: () => void }
    applyFilterSession: (s: FilterSession) => { run: () => void }
  }
  extensions: Extension[]
}

export function prepareFilterScope(sheet: FilterSheet): boolean {
  sheet.chain().prepareFilterFromSelection().run()
  return !!getFilterSession(sheet)
}

export function clearFilter(sheet: FilterSheet): void {
  sheet.chain().clearFilter().run()
}

export function dismissPendingFilter(sheet: FilterSheet): void {
  sheet.chain().dismissFilterPanel().run()
}

export function applyFilterSession(sheet: FilterSheet, session: FilterSession): void {
  sheet.chain().applyFilterSession(session).run()
}

export function resolveFilterScopeFromSelection(
  state: { getSelection: () => Selection; getCellData: (r: number, c: number) => unknown; getRowCount: () => number },
  selection?: Selection,
) {
  return resolveFilterScope(state as import('@speed-sheet/core').SheetState, selection ?? state.getSelection())
}
export type { GetFilterUserId } from './user-id'
export { FILTER_YDOC_KEY, FILTER_PRIVATE_YDOC_KEY } from './persist'