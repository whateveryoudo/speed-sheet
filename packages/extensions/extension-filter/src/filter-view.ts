import type { Sheet } from '@speed-sheet/core'
import type { FilterExtensionStorage, FilterSession } from './types'

export function filterMarkerRow(session: FilterSession): number {
  if (session.headerRow != null) return session.headerRow
  return Math.max(0, session.dataStartRow - 1)
}

export function syncSheetFilterView(sheet: Sheet, storage: FilterExtensionStorage): void {
  const session = storage.session
  if (!session) {
    sheet.setFilterView(null)
    return
  }
  sheet.setFilterView({
    hiddenRows: session.active ? storage.hiddenRows : new Set<number>(),
    columns: session.columns,
    markerRow: filterMarkerRow(session),
    active: session.active,
    dataStartRow: session.dataStartRow,
    dataEndRow: session.dataEndRow,
    headerRow: session.headerRow,
  })
}
