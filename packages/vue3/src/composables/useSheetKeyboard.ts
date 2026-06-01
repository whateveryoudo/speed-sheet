import type { Ref, ComputedRef, MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { isPrintableKey, resolveKeyboardNav, type Sheet } from '@speed-sheet/core'

/** 焦点在气泡/工具栏等表单控件内时，不接管为单元格快捷键 */
function isTypingInFormControl(e: KeyboardEvent): boolean {
  const el = e.target
  if (!(el instanceof HTMLElement)) return false
  return !!el.closest(
    'input, textarea, select, [contenteditable="true"], .ant-input, .ant-select',
  )
}

function runExtensionKeyboardShortcuts(sheet: Sheet, key: string): boolean {
  for (const ext of sheet.extensions) {
    const shortcuts = ext.getKeyboardShortcuts(sheet)
    const handler = shortcuts[key]
    if (handler?.()) return true
  }
  return false
}

export function useSheetKeyboard(options: {
  sheet: Ref<Sheet | null>
  editable: MaybeRefOrGetter<boolean>
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
    if (isTypingInFormControl(e)) return
    const r = options.activeCell.value.r
    const c = options.activeCell.value.c
    const key = e.key
    const canEdit = toValue(options.editable)

    if ((e.ctrlKey || e.metaKey) && key === 'c') {
      e.preventDefault()
      options.sheet.value?.chain().copy().run()
      return
    }

    if (!canEdit) {
      const nav = resolveKeyboardNav({
        key,
        r,
        c,
        totalRows: options.totalRows.value,
        totalCols: options.totalCols.value,
      })
      if (nav.type === 'move') {
        e.preventDefault()
        options.applySelectRange(nav.r, nav.c, nav.r, nav.c)
        options.onCellClick(nav.r, nav.c)
        options.onDraw()
      }
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
      const s = options.sheet.value
      if (s && runExtensionKeyboardShortcuts(s, key)) {
        options.onDraw()
        return
      }
      s?.chain().clearSelection().run()
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
