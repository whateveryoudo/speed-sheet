<template>
  <div v-if="panel.open.value" class="cf-sidebar">
    <header class="cf-sidebar__header">
      <div class="cf-sidebar__title-row">
        <div class="cf-sidebar__logo-placeholder" aria-hidden="true" />
        <h3 class="cf-sidebar__title">{{ t('conditionalFormat.title') }}</h3>
      </div>
      <div class="cf-sidebar__header-actions">
        <a-button
          v-if="panel.mode.value === 'edit'"
          type="text"
          size="small"
          @click="panel.openList()"
        >
          <UndoOutlined />
        </a-button>
        <a-button type="text" size="small" @click="closeAll">
          <CloseOutlined />
        </a-button>
      </div>
    </header>

    <div v-if="panel.mode.value === 'list'" class="cf-sidebar__body">
      <div class="cf-sidebar__toolbar">
        <a-select
          v-model:value="listScope"
          size="small"
          class="cf-sidebar__scope"
          :options="scopeOptions"
        />
        <a-button type="text" size="small" @click="addNewRule">
          <PlusOutlined />
        </a-button>
        <a-button
          type="text"
          size="small"
          :disabled="!selectedRuleId"
          @click="removeSelectedRule"
        >
          <DeleteOutlined />
        </a-button>
      </div>

      <div v-if="visibleRules.length === 0" class="cf-sidebar__empty">
        {{ t('conditionalFormat.empty') }}
      </div>
      <ul v-else class="cf-rule-list">
        <li
          v-for="rule in visibleRules"
          :key="rule.id"
          class="cf-rule-item"
          :class="{ 'is-selected': selectedRuleId === rule.id }"
          @click="selectRule(rule.id)"
          @dblclick="editRule(rule)"
        >
          <div class="cf-rule-item__main">
            <span class="cf-rule-item__label">{{ formatCfRuleLabel(rule) }}</span>
            <span class="cf-rule-item__range">{{ formatCfRuleRange(rule) }}</span>
          </div>
          <div class="cf-rule-item__preview">
            <div
              v-if="rule.type === 'cell'"
              class="cf-rule-preview-cell"
              :style="cellPreviewStyle(rule)"
            >
              {{ t('conditionalFormat.stylePreview') }}
            </div>
            <div v-else class="cf-rule-preview-bar">
              <div
                class="cf-rule-preview-bar__fill"
                :style="dataBarPreviewStyle(rule)"
              />
            </div>
          </div>
        </li>
      </ul>
    </div>

    <div v-else class="cf-sidebar__body">
      <ConditionalFormatRuleEditor
        :rule="panel.editingRule.value"
        :range-pick-active="rangePick.active.value"
        @start-range-pick="onStartRangePick"
        @stop-range-pick="rangePick.cancelPick"
        @update:draft="onDraftUpdate"
      />
    </div>

    <footer class="cf-sidebar__footer">
      <a-button type="link" size="small" @click="panel.openList()">
        <SettingOutlined />
        {{ t('conditionalFormat.manageRules') }}
      </a-button>
      <div class="cf-sidebar__footer-actions">
        <a-button size="small" @click="closeAll">{{ t('conditionalFormat.cancel') }}</a-button>
        <a-button
          v-if="panel.mode.value === 'edit'"
          type="primary"
          size="small"
          @click="saveRule"
        >
          {{ t('conditionalFormat.confirm') }}
        </a-button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  SettingOutlined,
  UndoOutlined,
} from '@ant-design/icons-vue'
import type { CfRule } from '@speed-sheet/extension-conditional-format'
import {
  formatCfRuleLabel,
  formatCfRuleRange,
  getCfRules,
  parseRangeA1,
} from '@speed-sheet/extension-conditional-format'
import { useSheetToolbar } from '../composables/useSheetToolbar'
import { useConditionalFormatPanel } from '../composables/useConditionalFormatPanel'
import type { useCfRangePick } from '../composables/useCfRangePick'
import { DEFAULT_CF_CELL_STYLE } from '../helpers/cfPresets'
import ConditionalFormatRuleEditor from './ConditionalFormatRuleEditor.vue'

const props = defineProps<{
  rangePick: ReturnType<typeof useCfRangePick>
}>()

const { t } = useI18n()
const { sheet, revision } = useSheetToolbar()
const panel = useConditionalFormatPanel()
const rangePick = props.rangePick

const listScope = ref<'selection' | 'all'>('selection')
const selectedRuleId = ref<string | null>(null)
const editDraft = ref<CfRule | null>(null)

const rules = computed(() => {
  void revision.value
  const s = sheet.value
  return s ? getCfRules(s) : []
})

const scopeOptions = computed(() => [
  { value: 'selection', label: t('conditionalFormat.scope.selection') },
  { value: 'all', label: t('conditionalFormat.scope.all') },
])

const visibleRules = computed(() => {
  if (listScope.value === 'all') return rules.value
  const sel = sheet.value?.state.getSelection()
  if (!sel) return rules.value
  const { r0, r1, c0, c1 } = {
    r0: Math.min(sel.row[0], sel.row[1]),
    r1: Math.max(sel.row[0], sel.row[1]),
    c0: Math.min(sel.column[0], sel.column[1]),
    c1: Math.max(sel.column[0], sel.column[1]),
  }
  return rules.value.filter((rule) => {
    const rr0 = Math.min(rule.row[0], rule.row[1])
    const rr1 = Math.max(rule.row[0], rule.row[1])
    const cc0 = Math.min(rule.column[0], rule.column[1])
    const cc1 = Math.max(rule.column[0], rule.column[1])
    return rr0 <= r1 && rr1 >= r0 && cc0 <= c1 && cc1 >= c0
  })
})

watch(
  () => panel.open.value,
  (open) => {
    if (!open) {
      rangePick.cancelPick()
      selectedRuleId.value = null
      editDraft.value = null
    }
  },
)

watch(
  () => rangePick.overlayRange.value,
  (range) => {
    if (!range || !rangePick.active.value || !editDraft.value) return
    editDraft.value.row = [...range.row]
    editDraft.value.column = [...range.column]
    panel.editingRule.value = { ...editDraft.value }
  },
)

function cellPreviewStyle(rule: CfRule): Record<string, string> {
  const style = rule.style ?? DEFAULT_CF_CELL_STYLE
  return {
    background: style.bg ?? '#ffc7ce',
    color: style.fc ?? '#9c0006',
    fontWeight: style.bl ? 'bold' : 'normal',
    fontStyle: style.it ? 'italic' : 'normal',
    textDecoration: style.un ? 'line-through' : 'none',
  }
}

function dataBarPreviewStyle(rule: CfRule): Record<string, string> {
  const bar = rule.dataBar
  if (!bar) return { background: '#63c384', width: '70%' }
  if (bar.gradient) {
    return {
      background: `linear-gradient(90deg, ${bar.color} 0%, rgba(255,255,255,0.85) 100%)`,
      width: '70%',
    }
  }
  return { background: bar.color, width: '70%' }
}

function selectionRange(): { row: [number, number]; column: [number, number] } {
  const sel = sheet.value!.state.getSelection()
  return {
    row: [sel.row[0], sel.row[1]],
    column: [sel.column[0], sel.column[1]],
  }
}

function addNewRule(): void {
  const { row, column } = selectionRange()
  const draft: CfRule = {
    id: '',
    type: 'cell',
    row: [...row],
    column: [...column],
    conditionOp: 'greaterThan',
    conditionValue: '',
    style: { ...DEFAULT_CF_CELL_STYLE },
  }
  editDraft.value = draft
  panel.openEditor(draft)
}

function selectRule(id: string): void {
  selectedRuleId.value = id
}

function editRule(rule: CfRule): void {
  editDraft.value = JSON.parse(JSON.stringify(rule)) as CfRule
  panel.openEditor(editDraft.value)
}

function removeSelectedRule(): void {
  const id = selectedRuleId.value
  if (!id || !sheet.value) return
  sheet.value.chain().removeCfRule({ id }).run()
  selectedRuleId.value = null
}

function onDraftUpdate(draft: CfRule): void {
  editDraft.value = draft
}

function onStartRangePick(initial: string): void {
  rangePick.startPick(initial, (a1) => {
    const parsed = parseRangeA1(a1)
    if (!parsed || !editDraft.value) return
    editDraft.value.row = [...parsed.row]
    editDraft.value.column = [...parsed.column]
    panel.editingRule.value = { ...editDraft.value }
  })
}

function saveRule(): void {
  const s = sheet.value
  const draft = editDraft.value
  if (!s || !draft) return
  const payload = JSON.parse(JSON.stringify(draft)) as CfRule
  if (payload.id) {
    s.chain().updateCfRule(payload).run()
  } else {
    const { id: _id, ...rest } = payload
    s.chain().addCfRule(rest).run()
  }
  panel.openList()
  editDraft.value = null
}

function closeAll(): void {
  rangePick.cancelPick()
  panel.closePanel()
}
</script>

<style scoped lang="less">
.cf-sidebar {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 25;
  width: 320px;
  display: flex;
  flex-direction: column;
  background: var(--ant-color-bg-container);
  border-left: 1px solid var(--ant-color-border-secondary);
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.06);
}

.cf-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 8px;
  border-bottom: 1px solid var(--ant-color-border-secondary);
}

.cf-sidebar__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cf-sidebar__logo-placeholder {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: linear-gradient(135deg, #c4c4c4 0%, #e8e8e8 100%);
  flex-shrink: 0;
}

.cf-sidebar__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.cf-sidebar__header-actions {
  display: flex;
  gap: 2px;
}

.cf-sidebar__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
}

.cf-sidebar__toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.cf-sidebar__scope {
  flex: 1;
}

.cf-sidebar__empty {
  color: var(--ant-color-text-secondary);
  font-size: 12px;
  padding: 16px 0;
  text-align: center;
}

.cf-rule-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cf-rule-item {
  padding: 10px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;

  &.is-selected {
    border-color: var(--ant-color-primary);
    background: var(--ant-color-primary-bg);
  }
}

.cf-rule-item__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.cf-rule-item__label {
  font-size: 13px;
}

.cf-rule-item__range {
  font-size: 11px;
  color: var(--ant-color-text-secondary);
}

.cf-rule-preview-cell {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
}

.cf-rule-preview-bar {
  height: 20px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.cf-rule-preview-bar__fill {
  height: 100%;
}

.cf-sidebar__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-top: 1px solid var(--ant-color-border-secondary);
}

.cf-sidebar__footer-actions {
  display: flex;
  gap: 8px;
}
</style>
