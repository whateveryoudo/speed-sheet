import { computed, type Ref } from 'vue'
import type { Sheet } from '@speed-sheet/core'
import type { RenderOptions } from '@speed-sheet/core'
import { isFormulaText } from '@speed-sheet/extension-formula'
import type { FormulaEditContext } from './useFormulaEdit'

export type FormulaRefRange = NonNullable<RenderOptions['formulaRefRanges']>[number]

/** 画布侧公式选点与高亮（headless，供 SpeedSheet / 自定义外壳复用） */
export function useFormulaCanvas(
  sheet: Ref<Sheet | null>,
  formulaEdit: FormulaEditContext | null,
) {
  /** 公式栏编辑时由 formulaEdit.text 驱动；内联编辑时 canvas 自行判断 editorValue */
  const formulaPickMode = computed(
    () => !!formulaEdit && isFormulaText(formulaEdit.text.value),
  )

  const formulaRefRanges = computed<FormulaRefRange[]>(() => {
    if (!formulaPickMode.value || !sheet.value || !formulaEdit) return []
    return formulaEdit.highlights.value
      .filter((h) => h.sheetId === sheet.value!.getActiveSheetId())
      .map((h) => ({
        row: h.row,
        column: h.column,
        color: h.color,
      }))
  })

  function insertRefAt(
    r0: number,
    c0: number,
    r1?: number,
    c1?: number,
  ): void {
    const s = sheet.value
    if (!s || !formulaEdit) return
    formulaEdit.insertRef(s, r0, c0, r1, c1)
  }

  function handleFormulaCellClick(r: number, c: number): boolean {
    if (!formulaPickMode.value || !formulaEdit) return false
    insertRefAt(r, c)
    return true
  }

  function handleFormulaRangeSelect(
    r0: number,
    c0: number,
    r1: number,
    c1: number,
  ): boolean {
    if (!formulaPickMode.value || !formulaEdit) return false
    insertRefAt(r0, c0, r1, c1)
    return true
  }

  return {
    formulaPickMode,
    formulaRefRanges,
    insertRefAt,
    handleFormulaCellClick,
    handleFormulaRangeSelect,
  }
}
