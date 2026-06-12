import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import type { CfRule } from '@speed-sheet/extension-conditional-format'

export type CfPanelMode = 'list' | 'edit'

export interface ConditionalFormatPanelContext {
  open: Ref<boolean>
  mode: Ref<CfPanelMode>
  editingRule: Ref<CfRule | null>
  openPanel: () => void
  closePanel: () => void
  openList: () => void
  openEditor: (rule?: CfRule | null) => void
}

const CF_PANEL_KEY: InjectionKey<ConditionalFormatPanelContext> = Symbol(
  'speed-sheet-conditional-format-panel',
)

export function provideConditionalFormatPanel(): ConditionalFormatPanelContext {
  const open = ref(false)
  const mode = ref<CfPanelMode>('list')
  const editingRule = ref<CfRule | null>(null)

  const ctx: ConditionalFormatPanelContext = {
    open,
    mode,
    editingRule,
    openPanel() {
      open.value = true
      mode.value = 'list'
      editingRule.value = null
    },
    closePanel() {
      open.value = false
      mode.value = 'list'
      editingRule.value = null
    },
    openList() {
      mode.value = 'list'
      editingRule.value = null
    },
    openEditor(rule?: CfRule | null) {
      mode.value = 'edit'
      editingRule.value = rule ?? null
    },
  }

  provide(CF_PANEL_KEY, ctx)
  return ctx
}

export function useConditionalFormatPanel(): ConditionalFormatPanelContext {
  const ctx = inject(CF_PANEL_KEY)
  if (!ctx) throw new Error('useConditionalFormatPanel must be used under SpeedSheet')
  return ctx
}

export function useConditionalFormatPanelOptional(): ConditionalFormatPanelContext | null {
  return inject(CF_PANEL_KEY, null)
}
