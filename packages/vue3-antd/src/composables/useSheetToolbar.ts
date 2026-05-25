import { computed, inject } from 'vue'
import type { CellAttributes } from '@speed-sheet/shared'
import { SHEET_TOOLBAR_KEY } from './useSheetToolbarContext'

const STYLE_KEYS = ['fc', 'bg', 'bl', 'ff', 'fs', 'it', 'un', 'vt', 'ht', 'tr', 'tb'] as const

export function useSheetToolbar() {
  const injected = inject(SHEET_TOOLBAR_KEY)
  if (!injected) {
    throw new Error('useSheetToolbar must be used within SheetToolbar provider')
  }
  const ctx = injected

  const cellMap = computed(() => {
    const m = new Map<string, CellAttributes | null>()
    for (const { r, c, data } of ctx.cells.value ?? []) {
      m.set(`${r}_${c}`, data)
    }
    return m
  })

  const anchorRc = computed(() => {
    const sel = ctx.selection.value
    if (!sel) return { r: 0, c: 0 }
    return {
      r: sel.anchor?.r ?? sel.row[0],
      c: sel.anchor?.c ?? sel.column[0],
    }
  })

  const activeCell = computed(() => {
    const { r, c } = anchorRc.value
    return cellMap.value.get(`${r}_${c}`) ?? null
  })

  const editableCpt = computed(() => !!ctx.sheet.value)

  function forEachSelectedCell(fn: (r: number, c: number) => void): void {
    const sel = ctx.selection.value
    const sheet = ctx.sheet.value
    if (!sel || !sheet) return
    const r0 = Math.min(sel.row[0], sel.row[1])
    const r1 = Math.max(sel.row[0], sel.row[1])
    const c0 = Math.min(sel.column[0], sel.column[1])
    const c1 = Math.max(sel.column[0], sel.column[1])
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) fn(r, c)
    }
  }

  function pickStyle(cell: CellAttributes): Partial<CellAttributes> {
    const style: Partial<CellAttributes> = {}
    for (const k of STYLE_KEYS) {
      const v = cell[k as keyof CellAttributes]
      if (v !== undefined) (style as Record<string, unknown>)[k] = v
    }
    return style
  }

  return {
    ...ctx,
    cellMap,
    anchorRc,
    activeCell,
    editableCpt,
    forEachSelectedCell,
    pickStyle,
  }
}
