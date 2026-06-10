import { ref, computed, watch, nextTick, type Ref, type ComputedRef } from 'vue'
import { type GridLayout, type CellEntry, type Sheet } from '@speed-sheet/core'
import {
  computeEditorBox,
  computeEditorWidthPx,
  computeEditorStyles,
} from '@speed-sheet/view'
import type { CellAttributes } from '@speed-sheet/shared'
import type { FormulaEditContext } from './useFormulaEdit'
import {
  buildSheetRefToken,
  getCellFormulaInitial,
  isFormulaText,
  canPickFormulaRef,
  patchFormulaWithRef,
} from '@speed-sheet/extension-formula'
import type FormulaRichInput from '../components/FormulaRichInput.vue'

export function useSheetInlineEdit(options: {
  sheet: Ref<Sheet | null>
  formulaEdit: FormulaEditContext | null
  editorEl: Ref<InstanceType<typeof FormulaRichInput> | null>
  viewportEl: Ref<HTMLElement | undefined>
  rootEl: Ref<HTMLElement | undefined>
  layout: Ref<GridLayout>
  scrollX: Ref<number>
  scrollY: Ref<number>
  cellEntries: ComputedRef<CellEntry[]>
  cells: ComputedRef<Array<{ r: number; c: number; data: CellAttributes }>>
  commitBoundary: Ref<HTMLElement | null | undefined> | ComputedRef<HTMLElement | null | undefined>
  formulaPickModeProp: Ref<boolean> | ComputedRef<boolean>
  onDraw: () => void
}) {
  const editing = ref(false)
  const editorValue = ref('')
  const editR = ref(0)
  const editC = ref(0)
  const editorWidthPx = ref(0)

  const formulaDragAnchor = ref<{ r: number; c: number } | null>(null)
  let skipEditorBlurCommit = false
  let formulaDragMoved = false
  let deferredBlurCommitTimer: ReturnType<typeof setTimeout> | null = null
  let syncingFromFormulaEdit = false
  let syncingToFormulaEdit = false

  function clearDeferredBlurCommit(): void {
    if (deferredBlurCommitTimer !== null) {
      clearTimeout(deferredBlurCommitTimer)
      deferredBlurCommitTimer = null
    }
  }

  function editorBox() {
    return computeEditorBox({
      editR: editR.value,
      editC: editC.value,
      layout: options.layout.value,
      scrollX: options.scrollX.value,
      scrollY: options.scrollY.value,
      mergeContext: options.sheet.value?.createMergeContext(),
    })
  }

  function updateEditorWidth(): void {
    if (!editing.value) return
    editorWidthPx.value = computeEditorWidthPx({
      editR: editR.value,
      editC: editC.value,
      editorValue: editorValue.value,
      layout: options.layout.value,
      scrollX: options.scrollX.value,
      scrollY: options.scrollY.value,
      cellEntries: options.cellEntries.value,
      cells: options.cells.value,
      mergeContext: options.sheet.value?.createMergeContext(),
    })
  }

  const editorStyle = computed(() => {
    const { editor } = computeEditorStyles({
      box: editorBox(),
      viewportW: options.layout.value.viewportW,
      widthPx: editorWidthPx.value,
    })
    return editor
  })

  const editorFieldStyle = computed(() => {
    const { field } = computeEditorStyles({
      box: editorBox(),
      viewportW: options.layout.value.viewportW,
      widthPx: editorWidthPx.value,
    })
    return field
  })

  function inlineCanFormulaPick(): boolean {
    if (!editing.value || !isFormulaText(editorValue.value)) return false
    const caret = options.editorEl.value?.selectionStart ?? editorValue.value.length
    const session = options.formulaEdit?.refPickActive.value ?? false
    return canPickFormulaRef(editorValue.value, caret, session)
  }

  const effectiveFormulaPick = computed(
    () => options.formulaPickModeProp.value || inlineCanFormulaPick(),
  )

  function restoreFormulaEditingSelection(): void {
    const anchor = options.formulaEdit?.active.value
      ? options.formulaEdit.anchor.value
      : editing.value
        ? { r: editR.value, c: editC.value }
        : null
    if (!anchor || !options.sheet.value) return
    options.sheet.value
      .chain()
      .selectRange({
        row: [anchor.r, anchor.r],
        column: [anchor.c, anchor.c],
        anchor: { r: anchor.r, c: anchor.c },
      })
      .run()
  }

  function syncFormulaEditFromEditor(): void {
    if (syncingFromFormulaEdit || !editing.value) return
    const val = editorValue.value
    const fe = options.formulaEdit
    if (!isFormulaText(val)) {
      if (
        fe?.active.value &&
        fe.anchor.value.r === editR.value &&
        fe.anchor.value.c === editC.value
      ) {
        fe.cancel()
      }
      return
    }
    const caret = options.editorEl.value?.selectionStart ?? val.length
    if (!fe) return
    syncingToFormulaEdit = true
    if (!fe.active.value) {
      fe.start(editR.value, editC.value, val)
      fe.caret.value = caret
    } else {
      fe.setText(val, caret)
    }
    syncingToFormulaEdit = false
    fe.syncHighlights(options.sheet.value)
  }

  function syncFromFormulaEdit(): void {
    const fe = options.formulaEdit
    if (!fe?.active.value) return
    const { r, c } = fe.anchor.value
    if (options.sheet.value?.state.cellHasImages(r, c)) {
      fe.cancel()
      return
    }
    const dvSync = options.sheet.value?.state.getDataVerification(r, c)
    if (dvSync?.type === 'dropdown') {
      fe.cancel()
      return
    }
    const text = fe.text.value
    const caretPos = fe.caret.value

    const needOpen = !editing.value || editR.value !== r || editC.value !== c
    if (needOpen) {
      editR.value = r
      editC.value = c
      editorValue.value = text
      editing.value = true
    } else if (editorValue.value !== text) {
      editorValue.value = text
    }

    nextTick(() => {
      updateEditorWidth()
      options.editorEl.value?.focus()
      options.editorEl.value?.setSelectionRange(caretPos, caretPos)
    })
    fe.syncHighlights(options.sheet.value)
    restoreFormulaEditingSelection()
    options.onDraw()
  }

  watch(
    () =>
      [
        options.formulaEdit?.active.value,
        options.formulaEdit?.text.value,
        options.formulaEdit?.anchor.value.r,
        options.formulaEdit?.anchor.value.c,
      ] as const,
    () => {
      if (syncingToFormulaEdit || !options.formulaEdit?.active.value) return
      syncingFromFormulaEdit = true
      syncFromFormulaEdit()
      syncingFromFormulaEdit = false
    },
  )

  function ensureFormulaEditSynced(): void {
    if (!editing.value || !isFormulaText(editorValue.value)) return
    syncFormulaEditFromEditor()
  }

  function insertRefIntoEditor(r: number, c: number, r1?: number, c1?: number): void {
    const s = options.sheet.value
    if (!s) return
    ensureFormulaEditSynced()
    const fe = options.formulaEdit

    if (fe?.active.value) {
      fe.insertRef(s, r, c, r1, c1)
      editorValue.value = fe.text.value
      const caret = fe.caret.value
      nextTick(() => {
        options.editorEl.value?.focus()
        options.editorEl.value?.setSelectionRange(caret, caret)
        updateEditorWidth()
      })
      fe.syncHighlights(s)
      restoreFormulaEditingSelection()
      options.onDraw()
      return
    }

    const token = buildSheetRefToken(s, r, c, r1, c1)
    const caret = options.editorEl.value?.selectionStart ?? editorValue.value.length
    const { text, caret: nextCaret } = patchFormulaWithRef(editorValue.value, caret, token)
    editorValue.value = text
    nextTick(() => {
      options.editorEl.value?.focus()
      options.editorEl.value?.setSelectionRange(nextCaret, nextCaret)
      updateEditorWidth()
    })
    syncFormulaEditFromEditor()
    restoreFormulaEditingSelection()
    options.onDraw()
  }

  function cellEditInitial(r: number, c: number): string {
    const s = options.sheet.value
    if (!s) return ''
    const cell = s.state.getCellData(r, c)
    if (cell?.f) return getCellFormulaInitial(s, r, c)
    const raw = cell?.m ?? cell?.v
    if (raw != null && raw !== '') return String(raw)
    return ''
  }

  function openEditor(r: number, c: number, initial = ''): void {
    if (options.sheet.value?.state.cellHasImages(r, c)) return
    const dv = options.sheet.value?.state.getDataVerification(r, c)
    if (dv?.type === 'dropdown') return
    editR.value = r
    editC.value = c
    editorValue.value = initial
    editing.value = true
    if (isFormulaText(initial) && options.formulaEdit) {
      options.formulaEdit.start(r, c, initial)
    }
    nextTick(() => {
      updateEditorWidth()
      const el = options.editorEl.value
      if (!el) return
      el.focus()
      if (initial.length > 0) {
        el.setSelectionRange(initial.length, initial.length)
      }
    })
  }

  function commitEdit(): void {
    clearDeferredBlurCommit()
    if (!editing.value) return
    const val = editorValue.value
    const r = editR.value
    const c = editC.value
    if (isFormulaText(val)) {
      options.sheet.value?.chain().setCellFormula({ r, c, formula: val }).run()
    } else {
      options.sheet.value?.chain().setCellValue({ r, c, value: val }).run()
    }
    editing.value = false
    const fe = options.formulaEdit
    if (fe?.active.value && fe.anchor.value.r === r && fe.anchor.value.c === c) {
      fe.cancel()
    }
    options.onDraw()
  }

  function cancelEdit(): void {
    clearDeferredBlurCommit()
    editing.value = false
    const fe = options.formulaEdit
    if (
      fe?.active.value &&
      fe.anchor.value.r === editR.value &&
      fe.anchor.value.c === editC.value
    ) {
      fe.cancel()
    }
  }

  function endEditingForLayoutChange(): void {
    if (editing.value) commitEdit()
  }

  function syncEditorCaret(): void {
    if (!editing.value || !options.formulaEdit?.active.value) return
    const caret = options.editorEl.value?.selectionStart ?? editorValue.value.length
    options.formulaEdit.caret.value = caret
  }

  function onEditorKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      syncEditorCaret()
      commitEdit()
      options.rootEl.value?.focus()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancelEdit()
      options.rootEl.value?.focus()
    }
  }

  function onEditorInput(): void {
    updateEditorWidth()
    syncFormulaEditFromEditor()
    options.onDraw()
  }

  function onEditorBlur(e: FocusEvent): void {
    if (skipEditorBlurCommit) {
      skipEditorBlurCommit = false
      return
    }
    const rel = e.relatedTarget as Node | null
    if (rel && options.viewportEl.value?.contains(rel)) {
      nextTick(() => options.editorEl.value?.focus())
      return
    }
    if (rel && options.commitBoundary.value?.contains(rel)) return
    if (isFormulaText(editorValue.value)) {
      clearDeferredBlurCommit()
      deferredBlurCommitTimer = setTimeout(() => {
        deferredBlurCommitTimer = null
        if (skipEditorBlurCommit) {
          skipEditorBlurCommit = false
          return
        }
        if (editing.value) commitEdit()
      }, 0)
      return
    }
    commitEdit()
  }

  function previewFormulaRange(r0: number, c0: number, r1: number, c1: number): void {
    if (!editing.value || !isFormulaText(editorValue.value)) return
    const s = options.sheet.value
    if (!s) return
    ensureFormulaEditSynced()
    const caret = options.editorEl.value?.selectionStart ?? editorValue.value.length
    const fe = options.formulaEdit
    if (fe?.active.value) {
      fe.caret.value = caret
      fe.insertRef(s, r0, c0, r1, c1)
      editorValue.value = fe.text.value
      fe.syncHighlights(s)
    } else {
      const token = buildSheetRefToken(s, r0, c0, r1, c1)
      const { text, caret: nextCaret } = patchFormulaWithRef(editorValue.value, caret, token)
      editorValue.value = text
      syncFormulaEditFromEditor()
      nextTick(() => options.editorEl.value?.setSelectionRange(nextCaret, nextCaret))
    }
    options.onDraw()
  }

  function applyFormulaRefAtCell(
    r: number,
    c: number,
    r1?: number,
    c1?: number,
    emitPick?: (r: number, c: number) => void,
    emitRangePick?: (r0: number, c0: number, r1: number, c1: number) => void,
  ): void {
    if (editing.value && isFormulaText(editorValue.value)) {
      insertRefIntoEditor(r, c, r1, c1)
      return
    }
    if (r1 !== undefined && c1 !== undefined) {
      emitRangePick?.(r, c, r1, c1)
    } else {
      emitPick?.(r, c)
    }
  }

  function isFormulaPickDragging(): boolean {
    return formulaDragAnchor.value !== null
  }

  function startFormulaPick(r: number, c: number): void {
    clearDeferredBlurCommit()
    skipEditorBlurCommit = true
    ensureFormulaEditSynced()
    formulaDragAnchor.value = { r, c }
    formulaDragMoved = false
  }

  function updateFormulaPick(pt: { r: number; c: number }): void {
    const a = formulaDragAnchor.value
    if (!a) return
    if (pt.r !== a.r || pt.c !== a.c) formulaDragMoved = true
    if (formulaDragMoved) previewFormulaRange(a.r, a.c, pt.r, pt.c)
  }

  function endFormulaPick(
    emitPick: (r: number, c: number) => void,
    emitRangePick: (r0: number, c0: number, r1: number, c1: number) => void,
  ): void {
    const a = formulaDragAnchor.value
    if (!a) return
    if (!formulaDragMoved) {
      applyFormulaRefAtCell(a.r, a.c, undefined, undefined, emitPick, emitRangePick)
    } else {
      ensureFormulaEditSynced()
      editorValue.value = options.formulaEdit?.text.value ?? editorValue.value
      const caret = options.formulaEdit?.caret.value ?? editorValue.value.length
      nextTick(() => {
        options.editorEl.value?.focus()
        options.editorEl.value?.setSelectionRange(caret, caret)
      })
    }
    formulaDragAnchor.value = null
    formulaDragMoved = false
    skipEditorBlurCommit = true
    restoreFormulaEditingSelection()
  }

  function isEditingCell(r: number, c: number): boolean {
    return editing.value && editR.value === r && editC.value === c
  }

  return {
    editing,
    editorValue,
    editR,
    editC,
    editorStyle,
    editorFieldStyle,
    effectiveFormulaPick,
    clearDeferredBlurCommit,
    updateEditorWidth,
    openEditor,
    commitEdit,
    cancelEdit,
    cellEditInitial,
    endEditingForLayoutChange,
    syncEditorCaret,
    onEditorKeydown,
    onEditorInput,
    onEditorBlur,
    isFormulaPickDragging,
    startFormulaPick,
    updateFormulaPick,
    endFormulaPick,
    isEditingCell,
  }
}

export type UseSheetInlineEditReturn = ReturnType<typeof useSheetInlineEdit>
