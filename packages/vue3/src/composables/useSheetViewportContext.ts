import { computed, inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import type { GridLayout, Sheet } from '@speed-sheet/core'

export interface SheetViewportContext {
  sheet: Ref<Sheet | null>
  revision: Ref<number>
  layout: Ref<GridLayout>
  scrollX: Ref<number>
  scrollY: Ref<number>
  /** 滚动 / 行列尺寸 / 视口变化时递增，供 overlay 与 canvas 同频刷新 */
  viewportTick: Ref<number>
  editable: ComputedRef<boolean>
}

export const SHEET_VIEWPORT_KEY: InjectionKey<SheetViewportContext> = Symbol('sheetViewport')

export function provideSheetViewport(ctx: SheetViewportContext): SheetViewportContext {
  provide(SHEET_VIEWPORT_KEY, ctx)
  return ctx
}

export function useSheetViewport(): SheetViewportContext {
  const ctx = inject(SHEET_VIEWPORT_KEY)
  if (!ctx) {
    throw new Error('useSheetViewport must be used within SheetCanvas')
  }
  return ctx
}

export function useSheetViewportOptional(): SheetViewportContext | null {
  return inject(SHEET_VIEWPORT_KEY, null)
}
