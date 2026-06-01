import { inject, provide, ref, shallowRef, type InjectionKey, type Ref } from 'vue'
import {
  getFormulaHighlights,
  type FormulaRangeHighlight,
  buildSheetRefToken,
  getCellFormulaInitial,
  isFormulaText,
  patchFormulaWithRef,
  canPickFormulaRef,
} from '@speed-sheet/extension-formula'
import type { Sheet } from '@speed-sheet/core'

export type { FormulaRangeHighlight }

export interface FormulaEditContext {
  active: Ref<boolean>
  text: Ref<string>
  anchor: Ref<{ r: number; c: number }>
  caret: Ref<number>
  /** 已点选过引用（Luckysheet rangestart），直到 cancel / 非 pick 提交 */
  refPickActive: Ref<boolean>
  highlights: Ref<FormulaRangeHighlight[]>
  start: (r: number, c: number, initial?: string) => void
  /** 在指定单元格进入公式编辑（菜单/公式栏触发） */
  beginAtCell: (sheet: Sheet, r: number, c: number, fresh?: boolean) => void
  cancel: () => void
  setText: (text: string, caret?: number) => void
  insertRef: (sheet: Sheet, r0: number, c0: number, r1?: number, c1?: number, sheetId?: string) => void
  insertFunction: (fn: string) => void
  /** 从函数菜单选中：直接进入 =FN() 编辑态，不经过单独的 `=` */
  pickFunction: (sheet: Sheet, r: number, c: number, fn: string) => void
  syncHighlights: (sheet: Sheet | null) => void
}

export const FORMULA_EDIT_KEY: InjectionKey<FormulaEditContext> = Symbol('formulaEdit')

export function provideFormulaEdit(): FormulaEditContext {
  const active = ref(false)
  const text = ref('')
  const anchor = ref({ r: 0, c: 0 })
  const caret = ref(0)
  const refPickActive = ref(false)
  const highlights = shallowRef<FormulaRangeHighlight[]>([])

  const ctx: FormulaEditContext = {
    active,
    text,
    anchor,
    caret,
    refPickActive,
    highlights,
    start(r, c, initial = '') {
      active.value = true
      anchor.value = { r, c }
      text.value = initial
      caret.value = initial.length
      refPickActive.value = false
      highlights.value = []
      if (isFormulaText(initial)) ctx.syncHighlights(null)
    },
    beginAtCell(sheet, r, c, fresh = false) {
      if (sheet.state.cellHasImages(r, c)) return
      const initial = fresh ? '=' : getCellFormulaInitial(sheet, r, c)
      ctx.start(r, c, initial)
      caret.value = initial === '=' ? 1 : initial.length
    },
    cancel() {
      active.value = false
      text.value = ''
      caret.value = 0
      refPickActive.value = false
      highlights.value = []
    },
    setText(next, nextCaret) {
      text.value = next
      caret.value = nextCaret ?? next.length
      refPickActive.value = false
    },
    insertRef(sheet, r0, c0, r1, c1, sheetId) {
      const token = buildSheetRefToken(sheet, r0, c0, r1, c1, sheetId)
      const { text: next, caret: nextCaret } = patchFormulaWithRef(
        text.value,
        caret.value,
        token,
      )
      text.value = next
      caret.value = nextCaret
      refPickActive.value = true
      ctx.syncHighlights(sheet)
    },
    insertFunction(fn) {
      const cur = text.value
      const pos = Math.max(0, Math.min(caret.value, cur.length))
      const snippet = `${fn}()`
      let next: string
      let caretPos: number

      if (!isFormulaText(cur) || cur === '=' || pos <= 1) {
        next = `=${snippet}`
        caretPos = 1 + fn.length + 1
      } else {
        next = cur.slice(0, pos) + snippet + cur.slice(pos)
        caretPos = pos + fn.length + 1
      }

      active.value = true
      text.value = next
      caret.value = caretPos
    },
    pickFunction(sheet, r, c, fn) {
      if (sheet.state.cellHasImages(r, c)) return
      const sameCell =
        active.value && anchor.value.r === r && anchor.value.c === c
      const snippet = `${fn}()`

      active.value = true
      anchor.value = { r, c }

      if (sameCell && isFormulaText(text.value) && text.value !== '=' && caret.value > 1) {
        const cur = text.value
        const pos = Math.max(0, Math.min(caret.value, cur.length))
        text.value = cur.slice(0, pos) + snippet + cur.slice(pos)
        caret.value = pos + fn.length + 1
      } else {
        text.value = `=${snippet}`
        caret.value = 1 + fn.length + 1
      }

      ctx.syncHighlights(sheet)
    },
    syncHighlights(sheet) {
      if (!sheet || !isFormulaText(text.value)) {
        highlights.value = []
        return
      }
      highlights.value = getFormulaHighlights(sheet, text.value).filter(
        (h) => h.sheetId === sheet.getActiveSheetId(),
      )
    },
  }

  provide(FORMULA_EDIT_KEY, ctx)
  return ctx
}

export function useFormulaEdit(): FormulaEditContext {
  const ctx = inject(FORMULA_EDIT_KEY)
  if (!ctx) {
    throw new Error(
      'useFormulaEdit() 需在已调用 provideFormulaEdit() 的子组件中使用；根组件请用 provideFormulaEdit() 的返回值',
    )
  }
  return ctx
}

export function useFormulaEditOptional(): FormulaEditContext | null {
  return inject(FORMULA_EDIT_KEY, null)
}
