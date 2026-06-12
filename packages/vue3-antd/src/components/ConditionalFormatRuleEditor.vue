<template>
  <div class="cf-rule-editor">
    <div class="cf-field">
      <label class="cf-label">{{ t('conditionalFormat.applyRange') }}</label>
      <div class="cf-range-row">
        <a-input
          v-model:value="rangeText"
          size="small"
          :disabled="rangePickActive"
          @blur="syncRangeFromText"
        />
        <a-button
          type="text"
          size="small"
          class="cf-range-pick-btn"
          :class="{ 'is-active': rangePickActive }"
          @click="toggleRangePick"
        >
          <TableOutlined />
        </a-button>
      </div>
    </div>

    <div class="cf-field">
      <label class="cf-label">{{ t('conditionalFormat.ruleType') }}</label>
      <a-select
        v-model:value="draft.type"
        size="small"
        :options="ruleTypeOptions"
        @change="onRuleTypeChange"
      />
    </div>

    <template v-if="draft.type === 'cell'">
      <div class="cf-field">
        <a-select
          v-model:value="draft.conditionOp"
          size="small"
          :options="conditionOpOptions"
        />
      </div>
      <div class="cf-field">
        <a-input
          v-model:value="draft.conditionValue"
          size="small"
          :placeholder="t('conditionalFormat.valuePlaceholder')"
        />
      </div>
      <div v-if="draft.conditionOp === 'between'" class="cf-field">
        <a-input
          v-model:value="draft.conditionValue2"
          size="small"
          :placeholder="t('conditionalFormat.value2Placeholder')"
        />
      </div>

      <div class="cf-field">
        <label class="cf-label">{{ t('conditionalFormat.display') }}</label>
        <div class="cf-style-preview" :style="previewStyle">
          {{ t('conditionalFormat.stylePreview') }}
        </div>
        <div class="cf-style-tools">
          <a-button
            type="text"
            size="small"
            :class="{ 'is-active': draft.style?.bl }"
            @click="toggleStyle('bl')"
          >
            B
          </a-button>
          <a-button
            type="text"
            size="small"
            :class="{ 'is-active': draft.style?.it }"
            @click="toggleStyle('it')"
          >
            I
          </a-button>
          <a-button
            type="text"
            size="small"
            :class="{ 'is-active': draft.style?.un }"
            @click="toggleStyle('un')"
          >
            S
          </a-button>
          <a-input
            v-model:value="draft.style!.fc"
            type="color"
            class="cf-color-input"
            title="文字颜色"
          />
          <a-input
            v-model:value="draft.style!.bg"
            type="color"
            class="cf-color-input"
            title="填充颜色"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="cf-field">
        <label class="cf-label">{{ t('conditionalFormat.display') }}</label>
        <div class="cf-databar-preview">
          <div
            class="cf-databar-preview-bar"
            :style="dataBarPreviewStyle"
          />
        </div>
        <a-select
          v-model:value="dataBarColorKey"
          size="small"
          :options="dataBarColorOptions"
          @change="onDataBarColorChange"
        />
      </div>
      <div class="cf-field">
        <label class="cf-label">{{ t('conditionalFormat.minValue') }}</label>
        <a-select
          v-model:value="draft.dataBar!.minType"
          size="small"
          :options="boundTypeOptions"
        />
        <a-input
          v-if="draft.dataBar!.minType === 'num' || draft.dataBar!.minType === 'percent'"
          v-model:value="draft.dataBar!.minValue"
          size="small"
          class="cf-bound-input"
          placeholder="min"
        />
      </div>
      <div class="cf-field">
        <label class="cf-label">{{ t('conditionalFormat.maxValue') }}</label>
        <a-select
          v-model:value="draft.dataBar!.maxType"
          size="small"
          :options="boundTypeOptions"
        />
        <a-input
          v-if="draft.dataBar!.maxType === 'num' || draft.dataBar!.maxType === 'percent'"
          v-model:value="draft.dataBar!.maxValue"
          size="small"
          class="cf-bound-input"
          placeholder="max"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SelectValue } from 'ant-design-vue/es/select'
import { TableOutlined } from '@ant-design/icons-vue'
import type { CfRule } from '@speed-sheet/extension-conditional-format'
import {
  formatRangeA1,
  parseRangeA1,
} from '@speed-sheet/extension-conditional-format'
import {
  CF_CELL_OP_OPTIONS,
  CF_DATA_BAR_GRADIENT_PRESETS,
  CF_DATA_BAR_SOLID_PRESETS,
  DEFAULT_CF_CELL_STYLE,
} from '../helpers/cfPresets'

const props = defineProps<{
  rule: CfRule | null
  rangePickActive: boolean
}>()

const emit = defineEmits<{
  'start-range-pick': [initial: string]
  'stop-range-pick': []
  'update:draft': [rule: CfRule]
}>()

const { t } = useI18n()

function createDraft(rule: CfRule | null): CfRule {
  if (rule) return JSON.parse(JSON.stringify(rule)) as CfRule
  return {
    id: '',
    type: 'cell',
    row: [0, 0],
    column: [0, 0],
    conditionOp: 'greaterThan',
    conditionValue: '',
    style: { ...DEFAULT_CF_CELL_STYLE },
    dataBar: {
      color: '#63c384',
      gradient: true,
      minType: 'min',
      maxType: 'max',
    },
  }
}

const draft = reactive<CfRule>(createDraft(props.rule))
const rangeText = ref(formatRangeA1(draft.row, draft.column))
const dataBarColorKey = ref('g-green')

watch(
  () => props.rule,
  (r) => {
    const next = createDraft(r)
    Object.assign(draft, next)
    rangeText.value = formatRangeA1(draft.row, draft.column)
    syncDataBarColorKey()
  },
)

watch(
  draft,
  () => {
    emit('update:draft', JSON.parse(JSON.stringify(draft)) as CfRule)
  },
  { deep: true },
)

watch(
  () => props.rangePickActive,
  (active) => {
    if (!active) syncRangeFromText()
  },
)

const ruleTypeOptions = computed(() => [
  { value: 'cell', label: t('conditionalFormat.type.cell') },
  { value: 'dataBar', label: t('conditionalFormat.type.dataBar') },
])

const conditionOpOptions = computed(() =>
  CF_CELL_OP_OPTIONS.map((o) => ({ value: o.key, label: t(o.labelKey) })),
)

const boundTypeOptions = computed(() => [
  { value: 'min', label: t('conditionalFormat.bound.min') },
  { value: 'max', label: t('conditionalFormat.bound.max') },
  { value: 'num', label: t('conditionalFormat.bound.num') },
  { value: 'percent', label: t('conditionalFormat.bound.percent') },
])

const allDataBarPresets = [...CF_DATA_BAR_GRADIENT_PRESETS, ...CF_DATA_BAR_SOLID_PRESETS]

const dataBarColorOptions = computed(() =>
  allDataBarPresets.map((p) => ({
    value: p.id,
    label: t(p.labelKey) + (p.gradient ? ` (${t('conditionalFormat.gradient')})` : ''),
  })),
)

const previewStyle = computed(() => ({
  background: draft.style?.bg ?? '#ffc7ce',
  color: draft.style?.fc ?? '#9c0006',
  fontWeight: draft.style?.bl ? 'bold' : 'normal',
  fontStyle: draft.style?.it ? 'italic' : 'normal',
  textDecoration: draft.style?.un ? 'line-through' : 'none',
}))

const dataBarPreviewStyle = computed(() => {
  const bar = draft.dataBar
  if (!bar) return {}
  if (bar.gradient) {
    return {
      background: `linear-gradient(90deg, ${bar.color} 0%, rgba(255,255,255,0.85) 100%)`,
    }
  }
  return { background: bar.color }
})

function syncDataBarColorKey(): void {
  const bar = draft.dataBar
  if (!bar) return
  const hit = allDataBarPresets.find(
    (p) => p.color === bar.color && p.gradient === bar.gradient,
  )
  dataBarColorKey.value = hit?.id ?? 'g-green'
}

function onRuleTypeChange(): void {
  if (draft.type === 'cell' && !draft.style) {
    draft.style = { ...DEFAULT_CF_CELL_STYLE }
  }
  if (draft.type === 'dataBar' && !draft.dataBar) {
    draft.dataBar = {
      color: '#63c384',
      gradient: true,
      minType: 'min',
      maxType: 'max',
    }
    syncDataBarColorKey()
  }
}

function onDataBarColorChange(value: SelectValue): void {
  const id = typeof value === 'string' ? value : String(value ?? '')
  const preset = allDataBarPresets.find((p) => p.id === id)
  if (!preset || !draft.dataBar) return
  draft.dataBar.color = preset.color
  draft.dataBar.gradient = preset.gradient
}

function toggleStyle(key: 'bl' | 'it' | 'un'): void {
  if (!draft.style) draft.style = { ...DEFAULT_CF_CELL_STYLE }
  draft.style[key] = draft.style[key] ? 0 : 1
}

function syncRangeFromText(): void {
  const parsed = parseRangeA1(rangeText.value)
  if (!parsed) return
  draft.row = [...parsed.row]
  draft.column = [...parsed.column]
  rangeText.value = formatRangeA1(draft.row, draft.column)
}

function toggleRangePick(): void {
  if (props.rangePickActive) {
    emit('stop-range-pick')
    return
  }
  emit('start-range-pick', rangeText.value)
}

syncDataBarColorKey()
</script>

<style scoped lang="less">
.cf-rule-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cf-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cf-label {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.cf-range-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cf-range-pick-btn {
  flex-shrink: 0;

  &.is-active {
    color: var(--ant-color-primary);
    background: var(--ant-color-primary-bg);
  }
}

.cf-style-preview {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.cf-style-tools {
  display: flex;
  align-items: center;
  gap: 4px;

  .is-active {
    color: var(--ant-color-primary);
    background: var(--ant-color-primary-bg);
  }
}

.cf-color-input {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  cursor: pointer;
}

.cf-databar-preview {
  height: 28px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.cf-databar-preview-bar {
  height: 100%;
  width: 70%;
}

.cf-bound-input {
  margin-top: 4px;
}
</style>
