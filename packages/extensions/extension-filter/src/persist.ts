import type { SheetState } from '@speed-sheet/core'
import { transactUser } from '@speed-sheet/core'
import type { FilterSession } from './types'

/** 文档级共享筛选（visibleToAll=true） */
export const FILTER_YDOC_KEY = 'sheetFilter'

/** 按 userId 分桶的私有筛选：Record<userId, FilterSessionJSON> */
export const FILTER_PRIVATE_YDOC_KEY = 'sheetFilterPrivate'

export type FilterSessionSerialized = Omit<FilterSession, 'columnRules'> & {
  columnRules: FilterSession['columnRules']
}

type PrivateFilterStore = Record<string, FilterSessionSerialized>

export function serializeFilterSession(session: FilterSession): FilterSessionSerialized {
  return JSON.parse(JSON.stringify(session)) as FilterSessionSerialized
}

export function deserializeFilterSession(raw: unknown): FilterSession | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as FilterSessionSerialized
  if (!Array.isArray(s.columns) || !Array.isArray(s.columnRules)) return null
  return {
    active: !!s.active,
    columns: s.columns,
    dataStartRow: s.dataStartRow,
    dataEndRow: s.dataEndRow,
    headerRow: s.headerRow ?? null,
    rangeLabel: s.rangeLabel ?? '',
    singleCell: s.singleCell,
    visibleToAll: !!s.visibleToAll,
    columnRules: s.columnRules,
  }
}

function readPrivateStore(state: SheetState): PrivateFilterStore {
  const raw = state.root.get(FILTER_PRIVATE_YDOC_KEY)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as PrivateFilterStore
}

function writePrivateStore(state: SheetState, store: PrivateFilterStore): void {
  const doc = state.root.doc
  if (!doc) return
  transactUser(doc, () => {
    if (Object.keys(store).length === 0) {
      if (state.root.has(FILTER_PRIVATE_YDOC_KEY)) state.root.delete(FILTER_PRIVATE_YDOC_KEY)
    } else {
      state.root.set(FILTER_PRIVATE_YDOC_KEY, store)
    }
  })
}

export function readFilterSessionFromYdoc(state: SheetState): FilterSession | null {
  const raw = state.root.get(FILTER_YDOC_KEY)
  const session = deserializeFilterSession(raw)
  if (!session?.visibleToAll) return null
  return session
}

export function readPrivateFilterFromYdoc(state: SheetState, userId: string): FilterSession | null {
  const session = deserializeFilterSession(readPrivateStore(state)[userId])
  if (!session || session.visibleToAll) return null
  return session
}

export function writeFilterSessionToYdoc(state: SheetState, session: FilterSession): void {
  const doc = state.root.doc
  if (!doc) return
  transactUser(doc, () => {
    state.root.set(FILTER_YDOC_KEY, serializeFilterSession({ ...session, visibleToAll: true }))
  })
}

export function writePrivateFilterToYdoc(
  state: SheetState,
  userId: string,
  session: FilterSession,
): void {
  const doc = state.root.doc
  if (!doc || !userId) return
  transactUser(doc, () => {
    const store = { ...readPrivateStore(state) }
    store[userId] = serializeFilterSession({ ...session, visibleToAll: false, active: true })
    writePrivateStore(state, store)
  })
}

export function clearPrivateFilterFromYdoc(state: SheetState, userId: string): void {
  const doc = state.root.doc
  if (!doc || !userId || !state.root.has(FILTER_PRIVATE_YDOC_KEY)) return
  transactUser(doc, () => {
    const store = { ...readPrivateStore(state) }
    delete store[userId]
    writePrivateStore(state, store)
  })
}

export function clearFilterFromYdoc(state: SheetState): void {
  const doc = state.root.doc
  if (!doc || !state.root.has(FILTER_YDOC_KEY)) return
  transactUser(doc, () => {
    state.root.delete(FILTER_YDOC_KEY)
  })
}
