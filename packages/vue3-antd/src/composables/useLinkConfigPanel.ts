import { inject, provide, reactive, ref, type InjectionKey, type Ref } from 'vue'

export interface LinkConfigPanelContext {
  open: Ref<boolean>
  anchor: { r: number; c: number }
  openPanel: (payload: { r: number; c: number }) => void
  closePanel: () => void
  registerCommit: (fn: () => void) => void
}

const LINK_CONFIG_PANEL_KEY: InjectionKey<LinkConfigPanelContext> = Symbol(
  'speed-sheet-link-config-panel',
)

export function provideLinkConfigPanel(): LinkConfigPanelContext {
  const open = ref(false)
  const anchor = reactive({ r: 0, c: 0 })
  let commitFn: (() => void) | null = null

  const ctx: LinkConfigPanelContext = {
    open,
    anchor,
    openPanel({ r, c }) {
      anchor.r = r
      anchor.c = c
      open.value = true
    },
    closePanel() {
      if (open.value) commitFn?.()
      open.value = false
    },
    registerCommit(fn) {
      commitFn = fn
    },
  }

  provide(LINK_CONFIG_PANEL_KEY, ctx)
  return ctx
}

export function useLinkConfigPanel(): LinkConfigPanelContext {
  const ctx = inject(LINK_CONFIG_PANEL_KEY)
  if (!ctx) throw new Error('useLinkConfigPanel must be used under SpeedSheet')
  return ctx
}

export function useLinkConfigPanelOptional(): LinkConfigPanelContext | null {
  return inject(LINK_CONFIG_PANEL_KEY, null)
}
