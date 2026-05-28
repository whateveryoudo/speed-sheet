import type { Ref, ComputedRef } from 'vue'
import { isPrintableKey, resolveKeyboardNav, type Sheet } from '@speed-sheet/core'

export function useSheetKeyboard(options: {
  sheet: Ref<Sheet | null>
  editing: Ref<boolean>
  activeCell: ComputedRef<{ r: number; c: number }>
  totalRows: ComputedRef<number>
  totalCols: ComputedRef<number>
  openEditor: (r: number, c: number, initial?: string) => void
  cellEditInitial: (r: number, c: number) => string
  applySelectRange: (
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    anchorR?: number,
    anchorC?: number,
  ) => void
  onCellClick: (r: number, c: number) => void
  onDraw: () => void
}) {
  function onKeyDown(e: KeyboardEvent): void {
    if (options.editing.value) return
    const r = options.activeCell.value.r
    const c = options.activeCell.value.c
    const key = e.key

    if ((e.ctrlKey || e.metaKey) && key === 'c') {
      e.preventDefault()
      options.sheet.value?.chain().copy().run()
      return
    }
    if ((e.ctrlKey || e.metaKey) && key === 'x') {
      e.preventDefault()
      options.sheet.value?.chain().cut().run()
      return
    }
    if ((e.ctrlKey || e.metaKey) && key === 'v') {
      e.preventDefault()
      options.sheet.value?.chain().paste().run()
      return
    }
    if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
      e.preventDefault()
      options.sheet.value?.chain().undo().run()
      return
    }
    if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
      e.preventDefault()
      options.sheet.value?.chain().redo().run()
      return
    }

    if (isPrintableKey(e)) {
      e.preventDefault()
      options.openEditor(r, c, key)
      return
    }

    const nav = resolveKeyboardNav({
      key,
      r,
      c,
      totalRows: options.totalRows.value,
      totalCols: options.totalCols.value,
    })
    if (nav.type === 'edit') {
      options.openEditor(nav.r, nav.c, options.cellEditInitial(nav.r, nav.c))
      return
    }
    if (nav.type === 'clear') {
      e.preventDefault()
      options.sheet.value?.chain().clearSelection().run()
      return
    }
    if (nav.type === 'noop') return

    e.preventDefault()
    options.applySelectRange(nav.r, nav.c, nav.r, nav.c)
    options.onCellClick(nav.r, nav.c)
    options.onDraw()
  }

  return { onKeyDown }
}
