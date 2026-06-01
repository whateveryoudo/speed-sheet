import { computed, inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'

export interface SheetEditorContext {
  editable: Ref<boolean>
  /** 是否允许修改表格（对齐 speed-tiptap-editor 的 editableCpt） */
  editableCpt: ComputedRef<boolean>
}

export const SHEET_EDITOR_KEY: InjectionKey<SheetEditorContext> = Symbol('sheetEditor')

export function provideSheetEditor(editable: Ref<boolean>): SheetEditorContext {
  const editableCpt = computed(() => editable.value)
  const ctx: SheetEditorContext = { editable, editableCpt }
  provide(SHEET_EDITOR_KEY, ctx)
  return ctx
}

export function useSheetEditorOptional(): SheetEditorContext | null {
  return inject(SHEET_EDITOR_KEY, null) ?? null
}

export function useSheetEditor(): SheetEditorContext {
  const ctx = useSheetEditorOptional()
  if (!ctx) {
    throw new Error('useSheetEditor must be used within SpeedSheet (provideSheetEditor)')
  }
  return ctx
}
