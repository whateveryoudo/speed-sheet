import { isPrintableKey, resolveKeyboardNav, type Sheet } from '@speed-sheet/core'

/** 焦点在气泡/工具栏等表单控件内时，不接管为单元格快捷键 */
export function isTypingInFormControl(e: KeyboardEvent): boolean {
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

export type KeyboardOptions = {
  getSheet: () => Sheet | null
  isEditable: () => boolean
  isEditing: () => boolean
  getActiveCell: () => { r: number; c: number }
  getTotalRows: () => number
  getTotalCols: () => number
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
}

export class KeyboardController {
  constructor(private readonly options: KeyboardOptions) {}

  onKeyDown(e: KeyboardEvent): void {
    if (this.options.isEditing()) return
    if (isTypingInFormControl(e)) return
    const { r, c } = this.options.getActiveCell()
    const key = e.key
    const canEdit = this.options.isEditable()

    if ((e.ctrlKey || e.metaKey) && key === 'c') {
      e.preventDefault()
      this.options.getSheet()?.chain().copy().run()
      return
    }

    if (!canEdit) {
      const nav = resolveKeyboardNav({
        key,
        r,
        c,
        totalRows: this.options.getTotalRows(),
        totalCols: this.options.getTotalCols(),
      })
      if (nav.type === 'move') {
        e.preventDefault()
        this.options.applySelectRange(nav.r, nav.c, nav.r, nav.c)
        this.options.onCellClick(nav.r, nav.c)
        this.options.onDraw()
      }
      return
    }

    if ((e.ctrlKey || e.metaKey) && key === 'x') {
      e.preventDefault()
      this.options.getSheet()?.chain().cut().run()
      return
    }
    if ((e.ctrlKey || e.metaKey) && key === 'v') {
      e.preventDefault()
      this.options.getSheet()?.chain().paste().run()
      return
    }
    if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
      e.preventDefault()
      this.options.getSheet()?.chain().undo().run()
      return
    }
    if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
      e.preventDefault()
      this.options.getSheet()?.chain().redo().run()
      return
    }

    if (isPrintableKey(e)) {
      e.preventDefault()
      this.options.openEditor(r, c, key)
      return
    }

    const nav = resolveKeyboardNav({
      key,
      r,
      c,
      totalRows: this.options.getTotalRows(),
      totalCols: this.options.getTotalCols(),
    })
    if (nav.type === 'edit') {
      this.options.openEditor(nav.r, nav.c, this.options.cellEditInitial(nav.r, nav.c))
      return
    }
    if (nav.type === 'clear') {
      e.preventDefault()
      const s = this.options.getSheet()
      if (s && runExtensionKeyboardShortcuts(s, key)) {
        this.options.onDraw()
        return
      }
      s?.chain().clearSelection().run()
      return
    }
    if (nav.type === 'noop') return

    e.preventDefault()
    this.options.applySelectRange(nav.r, nav.c, nav.r, nav.c)
    this.options.onCellClick(nav.r, nav.c)
    this.options.onDraw()
  }
}
