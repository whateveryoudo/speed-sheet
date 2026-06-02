import { inject, provide, reactive, ref, type InjectionKey, type Ref } from 'vue'

export interface FilterConfigPanelContext {
  open: Ref<boolean>
  anchor: { r: number; c: number }
  openPanel: (payload?: { r?: number; c?: number }) => void
  closePanel: () => void
}

const FILTER_CONFIG_PANEL_KEY: InjectionKey<FilterConfigPanelContext> = Symbol(
  'speed-sheet-filter-config-panel',
)

export function provideFilterConfigPanel(): FilterConfigPanelContext {
  const open = ref(false)
  const anchor = reactive({ r: 0, c: 0 })

  const ctx: FilterConfigPanelContext = {
    open,
    anchor,
    openPanel(payload?: { r?: number; c?: number }) {
      if (payload?.r != null) anchor.r = payload.r
      if (payload?.c != null) anchor.c = payload.c
      open.value = true
    },
    closePanel() {
      open.value = false
    },
  }

  provide(FILTER_CONFIG_PANEL_KEY, ctx)
  return ctx
}

export function useFilterConfigPanel(): FilterConfigPanelContext {
  const ctx = inject(FILTER_CONFIG_PANEL_KEY)
  if (!ctx) throw new Error('useFilterConfigPanel must be used under SpeedSheet')
  return ctx
}

export function useFilterConfigPanelOptional(): FilterConfigPanelContext | null {
  return inject(FILTER_CONFIG_PANEL_KEY, null)
}
