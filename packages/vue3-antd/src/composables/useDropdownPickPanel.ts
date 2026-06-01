import { inject, provide, reactive, ref, type InjectionKey, type Ref } from 'vue'

export interface DropdownPickPanelContext {
  open: Ref<boolean>
  anchor: { r: number; c: number }
  openPick: (payload: { r: number; c: number }) => void
  closePick: () => void
  /** 再次点击同一格时收起 */
  togglePick: (payload: { r: number; c: number }) => void
}

const DROPDOWN_PICK_PANEL_KEY: InjectionKey<DropdownPickPanelContext> = Symbol(
  'speed-sheet-dropdown-pick-panel',
)

export function provideDropdownPickPanel(): DropdownPickPanelContext {
  const open = ref(false)
  const anchor = reactive({ r: 0, c: 0 })

  const ctx: DropdownPickPanelContext = {
    open,
    anchor,
    openPick({ r, c }) {
      anchor.r = r
      anchor.c = c
      open.value = true
    },
    closePick() {
      open.value = false
    },
    togglePick({ r, c }) {
      if (open.value && anchor.r === r && anchor.c === c) {
        open.value = false
        return
      }
      anchor.r = r
      anchor.c = c
      open.value = true
    },
  }

  provide(DROPDOWN_PICK_PANEL_KEY, ctx)
  return ctx
}

export function useDropdownPickPanel(): DropdownPickPanelContext {
  const ctx = inject(DROPDOWN_PICK_PANEL_KEY)
  if (!ctx) {
    throw new Error('useDropdownPickPanel must be used under SpeedSheet')
  }
  return ctx
}

export function useDropdownPickPanelOptional(): DropdownPickPanelContext | null {
  return inject(DROPDOWN_PICK_PANEL_KEY, null)
}
