import { inject, provide, reactive, ref, type InjectionKey, type Ref } from 'vue'

export interface DropdownConfigPanelContext {
  open: Ref<boolean>
  anchor: { r: number; c: number }
  openPanel: (payload: { r: number; c: number }) => void
  closePanel: () => void
}

const DROPDOWN_CONFIG_PANEL_KEY: InjectionKey<DropdownConfigPanelContext> = Symbol(
  'speed-sheet-dropdown-config-panel',
)

export function provideDropdownConfigPanel(): DropdownConfigPanelContext {
  const open = ref(false)
  const anchor = reactive({ r: 0, c: 0 })

  const ctx: DropdownConfigPanelContext = {
    open,
    anchor,
    openPanel({ r, c }) {
      anchor.r = r
      anchor.c = c
      open.value = true
    },
    closePanel() {
      open.value = false
    },
  }

  provide(DROPDOWN_CONFIG_PANEL_KEY, ctx)
  return ctx
}

export function useDropdownConfigPanel(): DropdownConfigPanelContext {
  const ctx = inject(DROPDOWN_CONFIG_PANEL_KEY)
  if (!ctx) {
    throw new Error('useDropdownConfigPanel must be used under SpeedSheet')
  }
  return ctx
}

export function useDropdownConfigPanelOptional(): DropdownConfigPanelContext | null {
  return inject(DROPDOWN_CONFIG_PANEL_KEY, null)
}
