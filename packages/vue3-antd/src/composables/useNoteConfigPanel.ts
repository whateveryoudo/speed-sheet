import { inject, provide, reactive, ref, type InjectionKey, type Ref } from 'vue'

export interface NoteConfigPanelOpenOptions {
  r: number
  c: number
  applySelection?: boolean
  autoFocus?: boolean
}

export interface NoteConfigPanelContext {
  open: Ref<boolean>
  editing: Ref<boolean>
  anchor: { r: number; c: number }
  applySelection: Ref<boolean>
  openPanel: (payload: NoteConfigPanelOpenOptions) => void
  closePanel: () => void
  registerCommit: (fn: () => void) => void
  cancelScheduledClose: () => void
  scheduleClose: () => void
  setEditing: (value: boolean) => void
}

const NOTE_CONFIG_PANEL_KEY: InjectionKey<NoteConfigPanelContext> = Symbol(
  'speed-sheet-note-config-panel',
)
const NOTE_CONFIG_AUTO_FOCUS_KEY: InjectionKey<Ref<boolean>> = Symbol(
  'speed-sheet-note-config-auto-focus',
)

export function provideNoteConfigPanel(): NoteConfigPanelContext {
  const open = ref(false)
  const editing = ref(false)
  const applySelection = ref(false)
  const autoFocus = ref(false)
  const anchor = reactive({ r: 0, c: 0 })
  let commitFn: (() => void) | null = null
  let closeTimer: ReturnType<typeof setTimeout> | null = null

  function cancelScheduledClose(): void {
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
  }

  const ctx: NoteConfigPanelContext = {
    open,
    editing,
    anchor,
    applySelection,
    openPanel({ r, c, applySelection: multi = false, autoFocus: focus = false }) {
      cancelScheduledClose()
      if (open.value && (anchor.r !== r || anchor.c !== c)) {
        commitFn?.()
      }
      anchor.r = r
      anchor.c = c
      applySelection.value = multi
      autoFocus.value = focus
      editing.value = false
      open.value = true
    },
    closePanel() {
      cancelScheduledClose()
      editing.value = false
      if (open.value) commitFn?.()
      open.value = false
    },
    registerCommit(fn) {
      commitFn = fn
    },
    cancelScheduledClose,
    scheduleClose() {
      if (editing.value) return
      cancelScheduledClose()
      closeTimer = setTimeout(() => {
        closeTimer = null
        if (open.value && !editing.value) {
          commitFn?.()
          open.value = false
        }
      }, 200)
    },
    setEditing(value: boolean) {
      editing.value = value
      if (value) cancelScheduledClose()
    },
  }

  // 供 NoteConfigPanel 读取是否自动聚焦
  provide(NOTE_CONFIG_AUTO_FOCUS_KEY, autoFocus)

  provide(NOTE_CONFIG_PANEL_KEY, ctx)
  return ctx
}

export function useNoteConfigPanel(): NoteConfigPanelContext {
  const ctx = inject(NOTE_CONFIG_PANEL_KEY)
  if (!ctx) throw new Error('useNoteConfigPanel must be used under SpeedSheet')
  return ctx
}

export function useNoteConfigPanelOptional(): NoteConfigPanelContext | null {
  return inject(NOTE_CONFIG_PANEL_KEY, null)
}

export function useNoteConfigAutoFocus(): Ref<boolean> {
  const v = inject(NOTE_CONFIG_AUTO_FOCUS_KEY)
  if (!v) throw new Error('useNoteConfigAutoFocus must be used under SpeedSheet')
  return v
}
