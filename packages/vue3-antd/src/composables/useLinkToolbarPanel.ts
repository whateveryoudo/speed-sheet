import { inject, provide, reactive, ref, type InjectionKey, type Ref } from 'vue'

export interface LinkToolbarPanelContext {
  open: Ref<boolean>
  anchor: { r: number; c: number }
  openToolbar: (payload: { r: number; c: number }) => void
  closeToolbar: () => void
  toggleToolbar: (payload: { r: number; c: number }) => void
}

const LINK_TOOLBAR_PANEL_KEY: InjectionKey<LinkToolbarPanelContext> = Symbol(
  'speed-sheet-link-toolbar-panel',
)

export function provideLinkToolbarPanel(): LinkToolbarPanelContext {
  const open = ref(false)
  const anchor = reactive({ r: 0, c: 0 })

  const ctx: LinkToolbarPanelContext = {
    open,
    anchor,
    openToolbar({ r, c }) {
      anchor.r = r
      anchor.c = c
      open.value = true
    },
    closeToolbar() {
      open.value = false
    },
    toggleToolbar({ r, c }) {
      if (open.value && anchor.r === r && anchor.c === c) {
        open.value = false
        return
      }
      anchor.r = r
      anchor.c = c
      open.value = true
    },
  }

  provide(LINK_TOOLBAR_PANEL_KEY, ctx)
  return ctx
}

export function useLinkToolbarPanel(): LinkToolbarPanelContext {
  const ctx = inject(LINK_TOOLBAR_PANEL_KEY)
  if (!ctx) throw new Error('useLinkToolbarPanel must be used under SpeedSheet')
  return ctx
}

export function useLinkToolbarPanelOptional(): LinkToolbarPanelContext | null {
  return inject(LINK_TOOLBAR_PANEL_KEY, null)
}
