import * as Y from 'yjs'
import { cellIdKey, parseCellIdKey } from '@speed-sheet/shared'
import type {
  BorderInfo,
  BorderSegment,
  CellAttributes,
  DataVerificationRule,
  MergeRange,
  SheetConfig,
  SheetImageItem,
  Selection,
  SheetSnapshot,
} from '@speed-sheet/shared'
import { dataVerificationKey } from '@speed-sheet/shared'
import { transactSystem, transactUser } from '../yjs/transact'
import { MIN_COL_WIDTH, MIN_ROW_HEIGHT } from '../renderer/grid-metrics'
import { mapColIndexAfterMove } from '../renderer/col-move-hit'
import { mapRowIndexAfterMove } from '../renderer/row-move-hit'
import {
  allocId,
  buildIdIndexes,
  cellsToIdRecord,
  deleteCellsForColId,
  deleteCellsForRowId,
  ensureLayoutOnSheet,
} from './sheet-layout'
import { MergeContext } from '../merge'
import {
  expandViewportCellBounds,
  isCellInViewportBounds,
  type ViewportCellBounds,
} from './viewport-cells'

function readMergeRange(val: unknown): MergeRange | null {
  if (!val) return null
  if (val instanceof Y.Map) {
    const r = val.get('r') as number
    const c = val.get('c') as number
    const rs = val.get('rs') as number
    const cs = val.get('cs') as number
    if (
      Number.isFinite(r) &&
      Number.isFinite(c) &&
      Number.isFinite(rs) &&
      Number.isFinite(cs)
    ) {
      return { r, c, rs, cs }
    }
    return null
  }
  if (
    typeof val === 'object' &&
    'r' in val &&
    'c' in val &&
    'rs' in val &&
    'cs' in val
  ) {
    return val as MergeRange
  }
  return null
}

/** Luckysheet：合并时取选区内第一个有内容/公式的格 */
function cellHasContent(data: CellAttributes | null): boolean {
  if (!data) return false
  if (data.f != null && String(data.f).length > 0) return true
  const v = data.v
  return v != null && v !== ''
}

/** 取消合并时从格复制样式，不含 v/m/f/ct（对齐 mergeCancel） */
function cellStyleOnly(data: CellAttributes): Partial<CellAttributes> {
  const out: Partial<CellAttributes> = {}
  const keys = [
    'bg',
    'fc',
    'fs',
    'bl',
    'it',
    'ff',
    'ht',
    'vt',
    'tb',
    'tr',
    'un',
    'qp',
  ] as const
  for (const k of keys) {
    if (data[k] !== undefined) out[k] = data[k] as never
  }
  return out
}

/** After move: perm[newIndex] = old index now at newIndex. */
function buildIndexMovePermutation(
  n: number,
  from: number,
  count: number,
  insertAt: number,
): number[] {
  const order = Array.from({ length: n }, (_, i) => i)
  const block = order.splice(from, count)
  order.splice(insertAt, 0, ...block)
  return order
}

/**
 * SheetState — per-sheet Yjs root.
 *
 * Layout (v2):
 *   rowOrder: Y.Array<rowId>   — display row index → stable id
 *   colOrder: Y.Array<colId>   — display col index → stable id
 *   cells:    Y.Map<"rowId:colId", Y.Map> — only non-empty cells
 *
 * insertRows / insertCols only mutate order arrays (+ row meta maps);
 * cell storage keys stay stable.
 */
export class SheetState {
  public root: Y.Map<unknown>

  /** 选区仅驻内存，不持久化（刷新后回到 A1） */
  private _localSelection: Selection = {
    row: [0, 0],
    column: [0, 0],
    anchor: { r: 0, c: 0 },
  }

  constructor(existing?: Y.Map<unknown>) {
    this.root = existing ?? new Y.Map()
    this._ensureSubstructures()
    ensureLayoutOnSheet(this.root)
    this._discardLegacyPersistedSelection()
  }

  /** 旧版曾把选区写入 Y.Doc，加载时清掉避免刷新后仍框选 */
  private _discardLegacyPersistedSelection(): void {
    if (!this.root.has('_selection')) return
    const doc = this.root.doc
    if (doc) transactSystem(doc, () => this.root.delete('_selection'))
    else this.root.delete('_selection')
  }

  private _transact(fn: () => void): void {
    const doc = this.root.doc
    if (doc) transactUser(doc, fn)
    else fn()
  }

  private _ensureSubstructures(): void {
    if (!this.root.has('cells')) this.root.set('cells', new Y.Map())
    if (!this.root.has('merges')) this.root.set('merges', new Y.Map())
    if (!this.root.has('rowHeight')) this.root.set('rowHeight', new Y.Map())
    if (!this.root.has('colWidth')) this.root.set('colWidth', new Y.Map())
    if (!this.root.has('rowHidden')) this.root.set('rowHidden', new Y.Map())
    if (!this.root.has('colHidden')) this.root.set('colHidden', new Y.Map())
    if (!this.root.has('freeze')) this.root.set('freeze', new Y.Map())
    if (!this.root.has('dataVerification')) this.root.set('dataVerification', new Y.Map())
    if (!this.root.has('images')) this.root.set('images', new Y.Map())
    if (!this.root.has('borders')) this.root.set('borders', new Y.Map())
  }

  get borders(): Y.Map<unknown> {
    return this.root.get('borders') as Y.Map<unknown>
  }

  get dataVerification(): Y.Map<unknown> {
    return this.root.get('dataVerification') as Y.Map<unknown>
  }

  get images(): Y.Map<unknown> {
    return this.root.get('images') as Y.Map<unknown>
  }

  getDataVerification(r: number, c: number): DataVerificationRule | null {
    const raw = this.dataVerification.get(dataVerificationKey(r, c))
    if (!raw || typeof raw !== 'object') return null
    return raw as DataVerificationRule
  }

  setDataVerification(r: number, c: number, rule: DataVerificationRule | null): void {
    const key = dataVerificationKey(r, c)
    this._transact(() => {
      if (rule == null) this.dataVerification.delete(key)
      else this.dataVerification.set(key, rule)
    })
  }

  getAllDataVerifications(): Array<{ r: number; c: number; rule: DataVerificationRule }> {
    const out: Array<{ r: number; c: number; rule: DataVerificationRule }> = []
    this.dataVerification.forEach((val, key) => {
      const [rs, cs] = key.split('_')
      const r = Number(rs)
      const c = Number(cs)
      if (!Number.isFinite(r) || !Number.isFinite(c)) return
      if (val && typeof val === 'object') {
        out.push({ r, c, rule: val as DataVerificationRule })
      }
    })
    return out
  }

  getImage(id: string): SheetImageItem | null {
    const raw = this.images.get(id)
    if (!raw || typeof raw !== 'object') return null
    return raw as SheetImageItem
  }

  getAllImages(): SheetImageItem[] {
    const out: SheetImageItem[] = []
    this.images.forEach((val) => {
      if (val && typeof val === 'object') out.push(val as SheetImageItem)
    })
    return out
  }

  getImagesAtCell(r: number, c: number): SheetImageItem[] {
    return this.getAllImages().filter((img) => img.row === r && img.col === c)
  }

  cellHasImages(r: number, c: number): boolean {
    return this.getImagesAtCell(r, c).length > 0
  }

  setImage(item: SheetImageItem): void {
    this._transact(() => {
      this.images.set(item.id, item)
    })
  }

  deleteImage(id: string): void {
    this._transact(() => {
      this.images.delete(id)
    })
  }

  // ---- Layout accessors ----

  get cells(): Y.Map<Y.Map<unknown>> {
    return this.root.get('cells') as Y.Map<Y.Map<unknown>>
  }

  get rowOrder(): Y.Array<string> {
    return this.root.get('rowOrder') as Y.Array<string>
  }

  get colOrder(): Y.Array<string> {
    return this.root.get('colOrder') as Y.Array<string>
  }

  get meta(): Y.Map<unknown> {
    if (!this.root.has('meta')) {
      this.root.set('meta', new Y.Map())
    }
    return this.root.get('meta') as Y.Map<unknown>
  }

  getRowCount(): number {
    return (this.meta.get('rowCount') as number) ?? this.rowOrder.length
  }

  getColCount(): number {
    return (this.meta.get('colCount') as number) ?? this.colOrder.length
  }

  getRowHeight(r: number, defaultHeight = 25): number {
    const v = this.rowHeight.get(String(r))
    return v != null ? Math.max(MIN_ROW_HEIGHT, v) : defaultHeight
  }

  getColWidth(c: number, defaultWidth = 120): number {
    const v = this.colWidth.get(String(c))
    return v != null ? Math.max(MIN_COL_WIDTH, v) : defaultWidth
  }

  setRowHeight(r: number, height: number): void {
    const h = Math.max(MIN_ROW_HEIGHT, Math.round(height))
    this._transact(() => {
      this.rowHeight.set(String(r), h)
    })
  }

  setColWidth(c: number, width: number): void {
    const w = Math.max(MIN_COL_WIDTH, Math.round(width))
    this._transact(() => {
      this.colWidth.set(String(c), w)
    })
  }

  setRowHeights(rows: number[], height: number): void {
    const h = Math.max(MIN_ROW_HEIGHT, Math.round(height))
    this._transact(() => {
      for (const r of rows) {
        this.rowHeight.set(String(r), h)
      }
    })
  }

  /**
   * 依据行内文字内容（特别是换行 tb=2 单元格）自动计算并更新行高：
   * 当换行撑高时变高；当取消换行（切换为溢出或截断）且行内无其他换行大高度格时，自动恢复回去。
   */
  autoFitRowHeight(r: number, defaultRowHeight = 25): void {
    const totalCols = this.getColCount()
    let maxH = defaultRowHeight

    for (let c = 0; c < totalCols; c++) {
      const cell = this.getCellData(r, c)
      if (!cell) continue
      const text = cell.m ?? cell.v
      if (text === null || text === undefined || text === '') continue

      const fs = cell.fs ?? 11
      const lineHeight = Math.round(fs * 1.35)

      if (cell.tb === 2) {
        // 换行模式：估算行数并撑高
        const colW = Math.max(20, this.getColWidth(c) - 8)
        const str = String(text)
        const paras = str.split('\n')
        let totalLines = 0
        // 平均字符宽度近似计算（中文约 fs，英文约 fs * 0.6）
        for (const para of paras) {
          if (!para) {
            totalLines += 1
            continue
          }
          let charUnits = 0
          for (let i = 0; i < para.length; i++) {
            charUnits += para.charCodeAt(i) > 127 ? 1 : 0.6
          }
          const lineCapacity = Math.max(1, Math.floor(colW / fs))
          totalLines += Math.max(1, Math.ceil(charUnits / lineCapacity))
        }
        const neededH = totalLines * lineHeight + 8 // 上下 padding
        if (neededH > maxH) {
          maxH = neededH
        }
      } else {
        const neededH = lineHeight + 8
        if (neededH > maxH) {
          maxH = neededH
        }
      }
    }

    if (maxH !== this.getRowHeight(r, defaultRowHeight)) {
      this.setRowHeight(r, maxH)
    }
  }

  setColWidths(cols: number[], width: number): void {
    const w = Math.max(MIN_COL_WIDTH, Math.round(width))
    this._transact(() => {
      for (const c of cols) {
        this.colWidth.set(String(c), w)
      }
    })
  }

  private _resolveIds(r: number, c: number): { rowId: string; colId: string } | null {
    const rowId = this.rowOrder.get(r)
    const colId = this.colOrder.get(c)
    if (rowId == null || colId == null) return null
    return { rowId, colId }
  }

  // ---- Cells (display coordinates) ----

  getCell(r: number, c: number): Y.Map<unknown> | undefined {
    const ids = this._resolveIds(r, c)
    if (!ids) return undefined
    return this.cells.get(cellIdKey(ids.rowId, ids.colId))
  }

  getCellData(r: number, c: number): CellAttributes | null {
    const cell = this.getCell(r, c)
    if (!cell || cell.size === 0) return null
    return cell.toJSON() as CellAttributes
  }

  /**
   * @param trackUndo When false, apply inline (caller must wrap transactSystem/User).
   */
  createMergeContext(): MergeContext {
    return MergeContext.fromRanges(this.getMergeRanges())
  }

  setCell(r: number, c: number, data: Partial<CellAttributes>, trackUndo = true): void {
    const anchor = this.createMergeContext().anchor(r, c)
    r = anchor.r
    c = anchor.c
    const ids = this._resolveIds(r, c)
    if (!ids) return

    const key = cellIdKey(ids.rowId, ids.colId)

    const write = (): void => {
      let cell = this.cells.get(key) as Y.Map<unknown> | undefined
      if (!cell) {
        cell = new Y.Map()
        this.cells.set(key, cell)
      }
      for (const [field, value] of Object.entries(data)) {
        if (value === undefined || value === null) {
          cell.delete(field)
        } else {
          cell.set(field, value)
        }
      }
      if (cell.size === 0) this.cells.delete(key)
    }
    if (trackUndo) this._transact(write)
    else write()
  }

  deleteCell(r: number, c: number, trackUndo = true): void {
    const ids = this._resolveIds(r, c)
    if (!ids) return
    const key = cellIdKey(ids.rowId, ids.colId)
    const write = (): void => {
      this.cells.delete(key)
    }
    if (trackUndo) this._transact(write)
    else write()
  }

  // ---- Row / column structure ----

  insertRows(atRow: number, count = 1): void {
    if (count <= 0) return
    this._transact(() => {
      const newIds: string[] = []
      for (let i = 0; i < count; i++) newIds.push(allocId(this.root, 'row'))
      this.rowOrder.insert(atRow, newIds)
      this.meta.set('rowCount', this.rowOrder.length)
      this.shiftIndexMap(this.rowHeight, atRow, count)
      this.shiftIndexMap(this.rowHidden, atRow, count)
      this._shiftMergesForRowInsert(atRow, count)
      this._shiftBordersForRowInsert(atRow, count)
    })
  }

  /**
   * Move `count` rows starting at `fromRow` so they appear before `insertBefore`.
   * Cell keys use stable rowId — only order + row-indexed config maps change.
   */
  moveRows(fromRow: number, insertBefore: number, count = 1): void {
    if (count <= 0) return
    const n = this.rowOrder.length
    const from = Math.max(0, Math.min(fromRow, n - 1))
    count = Math.min(count, n - from)
    if (count <= 0) return

    let to = Math.max(0, Math.min(n, insertBefore))
    if (to >= from && to < from + count) return

    this._transact(() => {
      const ids: string[] = []
      for (let i = 0; i < count; i++) {
        const id = this.rowOrder.get(from + i)
        if (id) ids.push(id)
      }
      if (ids.length === 0) return

      this.rowOrder.delete(from, count)
      let insertAt = to
      if (to > from) insertAt = to - count
      this.rowOrder.insert(insertAt, ids)

      const perm = buildIndexMovePermutation(n, from, count, insertAt)
      this._permuteRowIndexMap(this.rowHeight, perm)
      this._permuteRowIndexMap(this.rowHidden, perm)
      this._remapMergesForRowMove(from, count, insertAt)
    })
  }

  /**
   * Move `count` cols starting at `fromCol` so they appear before `insertBefore`.
   * Cell keys use stable colId — only order + col-indexed config maps change.
   */
  moveCols(fromCol: number, insertBefore: number, count = 1): void {
    if (count <= 0) return
    const n = this.colOrder.length
    const from = Math.max(0, Math.min(fromCol, n - 1))
    count = Math.min(count, n - from)
    if (count <= 0) return

    let to = Math.max(0, Math.min(n, insertBefore))
    if (to >= from && to < from + count) return

    this._transact(() => {
      const ids: string[] = []
      for (let i = 0; i < count; i++) {
        const id = this.colOrder.get(from + i)
        if (id) ids.push(id)
      }
      if (ids.length === 0) return

      this.colOrder.delete(from, count)
      let insertAt = to
      if (to > from) insertAt = to - count
      this.colOrder.insert(insertAt, ids)

      const perm = buildIndexMovePermutation(n, from, count, insertAt)
      this._permuteColIndexMap(this.colWidth, perm)
      this._permuteColIndexMap(this.colHidden, perm)
      this._remapMergesForColMove(from, count, insertAt)
    })
  }

  deleteRows(atRow: number, count = 1): void {
    if (count <= 0) return
    this._transact(() => {
      for (let i = 0; i < count; i++) {
        const rowId = this.rowOrder.get(atRow + i)
        if (rowId) deleteCellsForRowId(this.cells, rowId)
      }
      this.rowOrder.delete(atRow, count)
      this.meta.set('rowCount', this.rowOrder.length)
      this.shiftIndexMap(this.rowHeight, atRow, -count, count)
      this.shiftIndexMap(this.rowHidden, atRow, -count, count)
      this._shiftMergesForRowDelete(atRow, count)
      this._shiftBordersForRowDelete(atRow, count)
    })
  }

  insertCols(atCol: number, count = 1): void {
    if (count <= 0) return
    this._transact(() => {
      const newIds: string[] = []
      for (let i = 0; i < count; i++) newIds.push(allocId(this.root, 'col'))
      this.colOrder.insert(atCol, newIds)
      this.meta.set('colCount', this.colOrder.length)
      this.shiftIndexMap(this.colWidth, atCol, count)
      this.shiftIndexMap(this.colHidden, atCol, count)
      this._shiftMergesForColInsert(atCol, count)
      this._shiftBordersForColInsert(atCol, count)
    })
  }

  deleteCols(atCol: number, count = 1): void {
    if (count <= 0) return
    this._transact(() => {
      for (let i = 0; i < count; i++) {
        const colId = this.colOrder.get(atCol + i)
        if (colId) deleteCellsForColId(this.cells, colId)
      }
      this.colOrder.delete(atCol, count)
      this.meta.set('colCount', this.colOrder.length)
      this.shiftIndexMap(this.colWidth, atCol, -count, count)
      this.shiftIndexMap(this.colHidden, atCol, -count, count)
      this._shiftMergesForColDelete(atCol, count)
      this._shiftBordersForColDelete(atCol, count)
    })
  }

  getMergeRanges(): MergeRange[] {
    const result: MergeRange[] = []
    this.merges.forEach((val) => {
      const m = readMergeRange(val)
      if (m) result.push(m)
    })
    return result
  }

  /** 包含 (r,c) 的合并区；无则 null */
  getMergeAt(r: number, c: number): MergeRange | null {
    return this.createMergeContext().at(r, c) ?? null
  }

  /**
   * 合并选区：首个有值/公式的格写入锚点，其余格清空（Luckysheet mergeAll）。
   * 取消合并不会恢复合并前的各格数值。
   */
  mergeCells(r0: number, c0: number, r1: number, c1: number): void {
    const r = Math.min(r0, r1)
    const c = Math.min(c0, c1)
    const rs = Math.abs(r1 - r0) + 1
    const cs = Math.abs(c1 - c0) + 1
    if (rs <= 1 && cs <= 1) return
    const key = `${r}_${c}`
    this._transact(() => {
      let winner: CellAttributes | null = null
      for (let rr = r; rr < r + rs; rr++) {
        for (let cc = c; cc < c + cs; cc++) {
          const data = this.getCellData(rr, cc)
          if (cellHasContent(data) && !winner) {
            winner = { ...(data as CellAttributes) }
          }
        }
      }
      for (let rr = r; rr < r + rs; rr++) {
        for (let cc = c; cc < c + cs; cc++) {
          if (rr === r && cc === c) {
            if (winner) this.setCell(rr, cc, winner, false)
          } else {
            this.deleteCell(rr, cc, false)
          }
        }
      }
      this.merges.set(key, { r, c, rs, cs })
    })
  }

  /**
   * 取消合并：删除 merge 配置；锚点保留内容与样式，从格仅保留样式副本（无 v/m/f/ct）。
   */
  unmergeCells(r0: number, c0: number, r1: number, c1: number): void {
    const rMin = Math.min(r0, r1)
    const rMax = Math.max(r0, r1)
    const cMin = Math.min(c0, c1)
    const cMax = Math.max(c0, c1)

    const targets: MergeRange[] = []
    this.merges.forEach((val) => {
      const m = readMergeRange(val)
      if (!m || (m.rs <= 1 && m.cs <= 1)) return
      const intersects =
        m.r <= rMax &&
        m.r + m.rs - 1 >= rMin &&
        m.c <= cMax &&
        m.c + m.cs - 1 >= cMin
      if (intersects) targets.push(m)
    })
    if (!targets.length) return

    this._transact(() => {
      for (const m of targets) {
        const anchor = this.getCellData(m.r, m.c)
        for (let rr = m.r; rr < m.r + m.rs; rr++) {
          for (let cc = m.c; cc < m.c + m.cs; cc++) {
            if (rr === m.r && cc === m.c) continue
            if (anchor) {
              const style = cellStyleOnly(anchor)
              if (Object.keys(style).length > 0) {
                this.setCell(rr, cc, { ...style, v: null }, false)
              } else {
                this.deleteCell(rr, cc, false)
              }
            } else {
              this.deleteCell(rr, cc, false)
            }
          }
        }
        this.merges.delete(`${m.r}_${m.c}`)
      }
    })
  }

  // ---- Borders ----

  getBorder(r: number, c: number): BorderInfo | null {
    const raw = this.borders.get(`${r}_${c}`)
    if (!raw || typeof raw !== 'object') return null
    return raw as BorderInfo
  }

  getBorderList(): BorderInfo[] {
    const list: BorderInfo[] = []
    this.borders.forEach((val) => {
      if (val && typeof val === 'object') {
        list.push(val as BorderInfo)
      }
    })
    return list
  }

  setBorderCell(r: number, c: number, info: Partial<BorderInfo> | null): void {
    const key = `${r}_${c}`
    this._transact(() => {
      if (!info) {
        this.borders.delete(key)
        return
      }
      const existing = (this.borders.get(key) as BorderInfo | undefined) || { row_index: r, col_index: c }
      const updated: BorderInfo = {
        row_index: r,
        col_index: c,
        ...(existing.l ? { l: existing.l } : {}),
        ...(existing.r ? { r: existing.r } : {}),
        ...(existing.t ? { t: existing.t } : {}),
        ...(existing.b ? { b: existing.b } : {}),
      }
      if ('l' in info) {
        if (info.l) updated.l = info.l
        else delete updated.l
      }
      if ('r' in info) {
        if (info.r) updated.r = info.r
        else delete updated.r
      }
      if ('t' in info) {
        if (info.t) updated.t = info.t
        else delete updated.t
      }
      if ('b' in info) {
        if (info.b) updated.b = info.b
        else delete updated.b
      }
      if (!updated.l && !updated.r && !updated.t && !updated.b) {
        this.borders.delete(key)
      } else {
        this.borders.set(key, updated)
      }
    })
  }

  applyBorderRange(opts: {
    row: [number, number]
    column: [number, number]
    borderType:
      | 'all'
      | 'outside'
      | 'thick-outside'
      | 'inside'
      | 'horizontal'
      | 'vertical'
      | 'left'
      | 'right'
      | 'top'
      | 'bottom'
      | 'none'
    color?: string
    style?: number
  }): void {
    const { row, column, borderType, color = '#000000' } = opts
    const style = borderType === 'thick-outside' ? 8 : (opts.style ?? 1)
    const seg: BorderSegment = { style, color }

    const rMin = Math.min(row[0], row[1])
    const rMax = Math.max(row[0], row[1])
    const cMin = Math.min(column[0], column[1])
    const cMax = Math.max(column[0], column[1])

    this._transact(() => {
      if (borderType === 'none') {
        // Clear all borders within selection
        for (let r = rMin; r <= rMax; r++) {
          for (let c = cMin; c <= cMax; c++) {
            this.borders.delete(`${r}_${c}`)
          }
        }
        // Also clear adjacent outer borders facing this selection
        for (let c = cMin; c <= cMax; c++) {
          const above = this.getBorder(rMin - 1, c)
          if (above?.b) {
            const next = { ...above }
            delete next.b
            this.setBorderCell(rMin - 1, c, next)
          }
          const below = this.getBorder(rMax + 1, c)
          if (below?.t) {
            const next = { ...below }
            delete next.t
            this.setBorderCell(rMax + 1, c, next)
          }
        }
        for (let r = rMin; r <= rMax; r++) {
          const left = this.getBorder(r, cMin - 1)
          if (left?.r) {
            const next = { ...left }
            delete next.r
            this.setBorderCell(r, cMin - 1, next)
          }
          const right = this.getBorder(r, cMax + 1)
          if (right?.l) {
            const next = { ...right }
            delete next.l
            this.setBorderCell(r, cMax + 1, next)
          }
        }
        return
      }

      // For all, outside, thick-outside, inside, horizontal, vertical, left, right, top, bottom:
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          const patch: Partial<BorderInfo> = {}
          const isTop = r === rMin
          const isBottom = r === rMax
          const isLeft = c === cMin
          const isRight = c === cMax

          switch (borderType) {
            case 'all':
              patch.t = seg
              patch.b = seg
              patch.l = seg
              patch.r = seg
              break
            case 'outside':
            case 'thick-outside':
              if (isTop) patch.t = seg
              if (isBottom) patch.b = seg
              if (isLeft) patch.l = seg
              if (isRight) patch.r = seg
              break
            case 'inside':
              if (!isTop) patch.t = seg
              if (!isBottom) patch.b = seg
              if (!isLeft) patch.l = seg
              if (!isRight) patch.r = seg
              break
            case 'horizontal':
              if (!isTop) patch.t = seg
              if (!isBottom) patch.b = seg
              break
            case 'vertical':
              if (!isLeft) patch.l = seg
              if (!isRight) patch.r = seg
              break
            case 'left':
              if (isLeft) patch.l = seg
              break
            case 'right':
              if (isRight) patch.r = seg
              break
            case 'top':
              if (isTop) patch.t = seg
              break
            case 'bottom':
              if (isBottom) patch.b = seg
              break
          }

          if (Object.keys(patch).length > 0) {
            this.setBorderCell(r, c, patch)
          }
        }
      }
    })
  }

  private _shiftBordersForRowInsert(at: number, count: number): void {
    this._remapBorders((r, c) => ({
      r: r >= at ? r + count : r,
      c,
    }))
  }

  private _shiftBordersForRowDelete(at: number, count: number): void {
    const end = at + count
    this._remapBorders((r, c) => {
      if (r >= at && r < end) return null
      return {
        r: r >= end ? r - count : r,
        c,
      }
    })
  }

  private _shiftBordersForColInsert(at: number, count: number): void {
    this._remapBorders((r, c) => ({
      r,
      c: c >= at ? c + count : c,
    }))
  }

  private _shiftBordersForColDelete(at: number, count: number): void {
    const end = at + count
    this._remapBorders((r, c) => {
      if (c >= at && c < end) return null
      return {
        r,
        c: c >= end ? c - count : c,
      }
    })
  }

  private _remapBorders(
    map: (r: number, c: number) => { r: number; c: number } | null,
  ): void {
    const entries: Array<[string, BorderInfo]> = []
    this.borders.forEach((val, key) => {
      if (val && typeof val === 'object' && 'row_index' in val) {
        entries.push([key, val as BorderInfo])
      }
    })
    this.borders.clear()
    for (const [, b] of entries) {
      const next = map(b.row_index, b.col_index)
      if (!next) continue
      this.borders.set(`${next.r}_${next.c}`, {
        ...b,
        row_index: next.r,
        col_index: next.c,
      })
    }
  }

  getAllCells(): Array<{ r: number; c: number; data: CellAttributes }> {
    const { rowIndex, colIndex } = buildIdIndexes(this.rowOrder, this.colOrder)
    const result: Array<{ r: number; c: number; data: CellAttributes }> = []
    this.cells.forEach((cell, key) => {
      const ids = parseCellIdKey(key)
      if (!ids) return
      const r = rowIndex.get(ids.rowId)
      const c = colIndex.get(ids.colId)
      if (r === undefined || c === undefined) return
      result.push({ r, c, data: cell.toJSON() as CellAttributes })
    })
    return result
  }

  /** Non-empty cells intersecting viewport (+ merge / overflow spillover). */
  getCellsForViewport(bounds: ViewportCellBounds): Array<{ r: number; c: number; data: CellAttributes }> {
    const totalRows = this.rowOrder.length
    const totalCols = this.colOrder.length
    const expanded = expandViewportCellBounds(
      bounds,
      totalRows,
      totalCols,
      this.getMergeRanges(),
    )
    const { rowIndex, colIndex } = buildIdIndexes(this.rowOrder, this.colOrder)
    const result: Array<{ r: number; c: number; data: CellAttributes }> = []
    this.cells.forEach((cell, key) => {
      const ids = parseCellIdKey(key)
      if (!ids) return
      const r = rowIndex.get(ids.rowId)
      const c = colIndex.get(ids.colId)
      if (r === undefined || c === undefined) return
      if (!isCellInViewportBounds(r, c, expanded)) return
      result.push({ r, c, data: cell.toJSON() as CellAttributes })
    })
    return result
  }

  /** Resolve stable ids for a display coordinate (debug / formula hooks). */
  resolveCellIds(r: number, c: number): { rowId: string; colId: string } | null {
    return this._resolveIds(r, c)
  }

  // ---- Merge shift (display coordinates) ----

  private _shiftMergesForRowInsert(at: number, count: number): void {
    this._remapMerges((r, c, rs, cs) => ({
      r: r >= at ? r + count : r,
      c,
      rs,
      cs,
    }))
  }

  private _permuteRowIndexMap(map: Y.Map<number>, perm: number[]): void {
    this._permuteIndexMap(map, perm)
  }

  private _permuteColIndexMap(map: Y.Map<number>, perm: number[]): void {
    this._permuteIndexMap(map, perm)
  }

  private _permuteIndexMap(map: Y.Map<number>, perm: number[]): void {
    const old: Array<number | undefined> = []
    map.forEach((v, k) => {
      const i = parseInt(k, 10)
      if (!Number.isNaN(i)) old[i] = v
    })
    map.clear()
    for (let newIdx = 0; newIdx < perm.length; newIdx++) {
      const oldIdx = perm[newIdx]!
      const v = old[oldIdx]
      if (v !== undefined) map.set(String(newIdx), v)
    }
  }

  private _remapMergesForRowMove(from: number, count: number, insertAt: number): void {
    this._remapMerges((r, c, rs, cs) => {
      const nr = mapRowIndexAfterMove(r, from, count, insertAt)
      const nrEnd = mapRowIndexAfterMove(r + rs - 1, from, count, insertAt)
      if (nrEnd < nr) return null
      return { r: nr, c, rs: nrEnd - nr + 1, cs }
    })
  }

  private _shiftMergesForRowDelete(at: number, count: number): void {
    this._remapMerges((r, c, rs, cs) => {
      const end = at + count
      if (r >= at && r + rs <= end) return null
      let nr = r
      if (r >= end) nr = r - count
      else if (r < at && r + rs > at) nr = r
      return { r: nr, c, rs, cs }
    })
  }

  private _remapMergesForColMove(from: number, count: number, insertAt: number): void {
    this._remapMerges((r, c, rs, cs) => {
      const nc = mapColIndexAfterMove(c, from, count, insertAt)
      const ncEnd = mapColIndexAfterMove(c + cs - 1, from, count, insertAt)
      if (ncEnd < nc) return null
      return { r, c: nc, rs, cs: ncEnd - nc + 1 }
    })
  }

  private _shiftMergesForColInsert(at: number, count: number): void {
    this._remapMerges((r, c, rs, cs) => ({
      r,
      c: c >= at ? c + count : c,
      rs,
      cs,
    }))
  }

  private _shiftMergesForColDelete(at: number, count: number): void {
    this._remapMerges((r, c, rs, cs) => {
      const end = at + count
      if (c >= at && c + cs <= end) return null
      let nc = c
      if (c >= end) nc = c - count
      return { r, c: nc, rs, cs }
    })
  }

  private _remapMerges(
    map: (
      r: number,
      c: number,
      rs: number,
      cs: number,
    ) => { r: number; c: number; rs: number; cs: number } | null,
  ): void {
    const entries: Array<[string, { r: number; c: number; rs: number; cs: number }]> = []
    this.merges.forEach((val, key) => {
      if (val && typeof val === 'object' && 'r' in val) {
        entries.push([key, val as { r: number; c: number; rs: number; cs: number }])
      }
    })
    this.merges.clear()
    for (const [, m] of entries) {
      const next = map(m.r, m.c, m.rs, m.cs)
      if (!next) continue
      this.merges.set(`${next.r}_${next.c}`, next)
    }
  }

  private shiftIndexMap(
    map: Y.Map<number>,
    at: number,
    delta: number,
    deleteCount = 0,
  ): void {
    const entries: Array<[string, number]> = []
    map.forEach((v, k) => entries.push([k, v]))
    map.doc?.transact(() => {
      map.clear()
      for (const [k, v] of entries) {
        const idx = parseInt(k, 10)
        if (Number.isNaN(idx)) {
          map.set(k, v)
          continue
        }
        if (deleteCount > 0 && idx >= at && idx < at + deleteCount) continue
        let ni = idx
        if (deleteCount > 0 && idx >= at + deleteCount) ni = idx + delta
        else if (deleteCount === 0 && idx >= at) ni = idx + delta
        if (ni >= 0) map.set(String(ni), v)
      }
    })
  }

  // ---- Config accessors ----

  get merges(): Y.Map<unknown> {
    return this.root.get('merges') as Y.Map<unknown>
  }
  get rowHeight(): Y.Map<number> {
    return this.root.get('rowHeight') as Y.Map<number>
  }
  get colWidth(): Y.Map<number> {
    return this.root.get('colWidth') as Y.Map<number>
  }
  get rowHidden(): Y.Map<number> {
    return this.root.get('rowHidden') as Y.Map<number>
  }
  get colHidden(): Y.Map<number> {
    return this.root.get('colHidden') as Y.Map<number>
  }
  get freeze(): Y.Map<number> {
    return this.root.get('freeze') as Y.Map<number>
  }

  getFreezeState(): import('@speed-sheet/shared').FreezeState | null {
    const map = this.freeze
    const xSplit = map.get('xSplit') ?? 0
    const ySplit = map.get('ySplit') ?? 0
    if (xSplit <= 0 && ySplit <= 0) return null
    return { xSplit, ySplit }
  }

  setFreeze(state: import('@speed-sheet/shared').FreezeState): void {
    this._transact(() => {
      this.freeze.set('xSplit', Math.max(0, state.xSplit))
      this.freeze.set('ySplit', Math.max(0, state.ySplit))
    })
  }

  clearFreeze(): void {
    this._transact(() => {
      this.freeze.delete('xSplit')
      this.freeze.delete('ySplit')
    })
  }

  // ---- Selection ----

  setSelection(sel: Selection): void {
    const anchor = sel.anchor ?? { r: sel.row[0], c: sel.column[0] }
    this._localSelection = {
      row: [sel.row[0], sel.row[1]],
      column: [sel.column[0], sel.column[1]],
      anchor,
    }
  }

  getSelection(): Selection {
    return this._localSelection
  }

  // ---- Snapshot export ----

  toSnapshot(id: string, name: string): SheetSnapshot {
    const sheetFilter = this.root.get('sheetFilter')
    const sheetFilterPrivate = this.root.get('sheetFilterPrivate')
    return {
      id,
      name,
      order: 0,
      rowOrder: this.rowOrder.toArray(),
      colOrder: this.colOrder.toArray(),
      cells: cellsToIdRecord(this.cells),
      config: {
        merges: this.merges.toJSON() as SheetConfig['merges'],
        rowHeight: this.rowHeight.toJSON() as SheetConfig['rowHeight'],
        colWidth: this.colWidth.toJSON() as SheetConfig['colWidth'],
        rowHidden: this.rowHidden.toJSON() as SheetConfig['rowHidden'],
        colHidden: this.colHidden.toJSON() as SheetConfig['colHidden'],
        borders: this.getBorderList(),
        filters: [],
        freeze: this.freeze.toJSON() as SheetConfig['freeze'],
      },
      dataVerification: this.dataVerification.toJSON() as Record<string, DataVerificationRule>,
      images: this.images.toJSON() as Record<string, SheetImageItem>,
      ...(sheetFilter != null ? { sheetFilter } : {}),
      ...(sheetFilterPrivate != null && typeof sheetFilterPrivate === 'object' && !Array.isArray(sheetFilterPrivate)
        ? { sheetFilterPrivate: sheetFilterPrivate as Record<string, unknown> }
        : {}),
    }
  }
}
