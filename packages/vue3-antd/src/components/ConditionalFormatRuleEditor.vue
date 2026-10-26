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
        <a-popover
          v-model:open="colorPickerOpen"
          trigger="click"
          placement="bottomRight"
          :overlay-inner-style="{ padding: 0 }"
          overlay-class-name="sheet-cf-databar-popover"
        >
          <template #content>
            <div class="lake-sheet-toolbar-image-chose-wrapper">
              <div class="lake-sheet-toolbar-image-chose">
                <div class="lake-sheet-toolbar-image-chose-title">{{ t('conditionalFormat.gradientFill') }}</div>
                <div class="lake-sheet-toolbar-image-chose-group">
                  <div
                    v-for="p in CF_DATA_BAR_GRADIENT_PRESETS"
                    :key="p.id"
                    class="lake-sheet-toolbar-image-chose-item"
                    @click="onSelectDataBarPreset(p)"
                  >
                    <img
                      v-if="p.img"
                      :src="p.img"
                      class="lake-sheet-toolbar-image-chose-img"
                      :class="{ 'lake-sheet-toolbar-image-chose-img-active': p.id === dataBarColorKey }"
                      :alt="t(p.labelKey)"
                    />
                    <span v-else class="cf-preset-bar" :style="presetBarStyle(p)" />
                  </div>
                </div>
              </div>
              <div class="lake-sheet-toolbar-image-chose">
                <div class="lake-sheet-toolbar-image-chose-title">{{ t('conditionalFormat.solidFill') }}</div>
                <div class="lake-sheet-toolbar-image-chose-group">
                  <div
                    v-for="p in CF_DATA_BAR_SOLID_PRESETS"
                    :key="p.id"
                    class="lake-sheet-toolbar-image-chose-item"
                    @click="onSelectDataBarPreset(p)"
                  >
                    <img
                      v-if="p.img"
                      :src="p.img"
                      class="lake-sheet-toolbar-image-chose-img"
                      :class="{ 'lake-sheet-toolbar-image-chose-img-active': p.id === dataBarColorKey }"
                      :alt="t(p.labelKey)"
                    />
                    <span v-else class="cf-preset-bar" :style="presetBarStyle(p)" />
                  </div>
                </div>
              </div>
            </div>
          </template>
          <div class="cf-databar-selector-btn">
            <span class="cf-databar-selector-preview" :style="dataBarPreviewStyle" />
            <span class="cf-databar-selector-label">{{ currentPresetLabel }}</span>
            <DownOutlined class="cf-databar-selector-caret" />
          </div>
        </a-popover>
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
import { TableOutlined, DownOutlined } from '@ant-design/icons-vue'
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
const colorPickerOpen = ref(false)

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

const currentPreset = computed(() =>
  allDataBarPresets.find((p) => p.id === dataBarColorKey.value),
)

const currentPresetLabel = computed(() => {
  if (!currentPreset.value) return ''
  return (
    t(currentPreset.value.labelKey) +
    (currentPreset.value.gradient ? ` (${t('conditionalFormat.gradient')})` : '')
  )
})

function presetBarStyle(p: (typeof allDataBarPresets)[number]): Record<string, string> {
  if (p.gradient) {
    return {
      background: `linear-gradient(to right, ${p.color}, transparent)`,
    }
  }
  return { background: p.color }
}

function onSelectDataBarPreset(p: (typeof allDataBarPresets)[number]): void {
  dataBarColorKey.value = p.id
  if (draft.dataBar) {
    draft.dataBar.color = p.color
    draft.dataBar.gradient = p.gradient
  }
  colorPickerOpen.value = false
}

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

.cf-bound-input {
  margin-top: 4px;
}

.cf-databar-selector-btn {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 4px 11px;
  background: var(--ant-color-bg-container, #fff);
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;

  &:hover {
    border-color: var(--ant-color-primary, #1677ff);
  }
}

.cf-databar-selector-preview {
  width: 90px;
  height: 18px;
  border-radius: 3px;
  margin-right: 8px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.cf-databar-selector-label {
  flex: 1;
  font-size: 13px;
  color: var(--ant-color-text, #262626);
  text-align: right;
  margin-right: 6px;
}

.cf-databar-selector-caret {
  font-size: 11px;
  color: var(--ant-color-text-secondary, #8c8c8c);
}
</style>

<style lang="less">
.sheet-cf-databar-popover {
  .ant-popover-inner {
    padding: 0 !important;
  }
}
</style>
