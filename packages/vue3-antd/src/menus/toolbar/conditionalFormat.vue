<template>
  <a-dropdown
    v-model:open="open"
    :trigger="['click']"
    :disabled="!editableCpt"
    overlay-class-name="sheet-cf-dropdown"
  >
    <s-keymap-tip :title="editableCpt ? t('conditionalFormat.title') : null">
      <a-button type="text" class="shadow-btn-wrapper" :disabled="!editableCpt">
        <span class="cf-toolbar-icon" aria-hidden="true" />
        <CaretDownOutlined class="cf-toolbar-caret" />
      </a-button>
    </s-keymap-tip>
    <template #overlay>
      <a-menu @click="onMenuClick">
        <a-sub-menu key="highlight" :title="t('conditionalFormat.menu.highlight')">
          <a-menu-item v-for="op in cellOps" :key="`cell-${op.key}`">
            {{ t(op.labelKey) }}
          </a-menu-item>
          <a-menu-item key="cell-more">{{ t('conditionalFormat.menu.moreRules') }}</a-menu-item>
        </a-sub-menu>
        <a-sub-menu
          key="databar"
          :title="t('conditionalFormat.menu.dataBar')"
          popup-class-name="sheet-cf-databar-submenu"
        >
          <div class="lake-sheet-toolbar-image-chose-wrapper">
            <div class="lake-sheet-toolbar-image-chose">
              <div class="lake-sheet-toolbar-image-chose-title">{{ t('conditionalFormat.gradientFill') }}</div>
              <div class="lake-sheet-toolbar-image-chose-group">
                <div
                  v-for="p in gradientPresets"
                  :key="p.id"
                  class="lake-sheet-toolbar-image-chose-item"
                  @click="addDataBarPreset(p)"
                >
                  <img
                    v-if="p.img"
                    :src="p.img"
                    class="lake-sheet-toolbar-image-chose-img"
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
                  v-for="p in solidPresets"
                  :key="p.id"
                  class="lake-sheet-toolbar-image-chose-item"
                  @click="addDataBarPreset(p)"
                >
                  <img
                    v-if="p.img"
                    :src="p.img"
                    class="lake-sheet-toolbar-image-chose-img"
                    :alt="t(p.labelKey)"
                  />
                  <span v-else class="cf-preset-bar" :style="presetBarStyle(p)" />
                </div>
              </div>
            </div>
          </div>
        </a-sub-menu>
        <a-menu-item key="new">{{ t('conditionalFormat.menu.newRule') }}</a-menu-item>
        <a-menu-item key="manage">{{ t('conditionalFormat.menu.manage') }}</a-menu-item>
        <a-menu-divider />
        <a-menu-item key="clear">{{ t('conditionalFormat.menu.clear') }}</a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CaretDownOutlined } from '@ant-design/icons-vue'
import type { MenuProps } from 'ant-design-vue'
import type { CfCellConditionOp } from '@speed-sheet/extension-conditional-format'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import { useConditionalFormatPanelOptional } from '../../composables/useConditionalFormatPanel'
import {
  CF_CELL_OP_OPTIONS,
  CF_DATA_BAR_GRADIENT_PRESETS,
  CF_DATA_BAR_SOLID_PRESETS,
  DEFAULT_CF_CELL_STYLE,
  type CfDataBarPreset,
} from '../../helpers/cfPresets'

const { t } = useI18n()
const open = ref(false)
const { sheet, editableCpt } = useSheetToolbar()
const panel = useConditionalFormatPanelOptional()

const cellOps = CF_CELL_OP_OPTIONS
const gradientPresets = CF_DATA_BAR_GRADIENT_PRESETS
const solidPresets = CF_DATA_BAR_SOLID_PRESETS

function selectionRange(): { row: [number, number]; column: [number, number] } {
  const sel = sheet.value!.state.getSelection()
  return {
    row: [sel.row[0], sel.row[1]],
    column: [sel.column[0], sel.column[1]],
  }
}

function presetBarStyle(p: CfDataBarPreset): Record<string, string> {
  if (p.gradient) {
    return {
      background: `linear-gradient(90deg, ${p.color} 0%, rgba(255,255,255,0.9) 100%)`,
    }
  }
  return { background: p.color }
}

function addCellRule(op: CfCellConditionOp): void {
  const s = sheet.value
  if (!s) return
  const { row, column } = selectionRange()
  s.chain()
    .addCfRule({
      type: 'cell',
      row,
      column,
      conditionOp: op,
      conditionValue: op === 'greaterThan' ? '2' : '',
      style: { ...DEFAULT_CF_CELL_STYLE },
    })
    .run()
  panel?.openPanel()
}

function addDataBarPreset(p: CfDataBarPreset): void {
  open.value = false
  const s = sheet.value
  if (!s) return
  const { row, column } = selectionRange()
  s.chain()
    .addCfRule({
      type: 'dataBar',
      row,
      column,
      dataBar: {
        color: p.color,
        gradient: p.gradient,
        minType: 'min',
        maxType: 'max',
      },
    })
    .run()
  panel?.openPanel()
}

const onMenuClick: MenuProps['onClick'] = ({ key }) => {
  const s = sheet.value
  if (!s) return

  if (typeof key === 'string' && key.startsWith('cell-')) {
    open.value = false
    if (key === 'cell-more') {
      panel?.openPanel()
      return
    }
    const op = key.replace('cell-', '') as CfCellConditionOp
    addCellRule(op)
    return
  }

  open.value = false

  if (key === 'new') {
    panel?.openPanel()
    return
  }
  if (key === 'manage') {
    panel?.openPanel()
    return
  }
  if (key === 'clear') {
    s.chain().clearCfRules().run()
    return
  }
}
</script>

<style scoped lang="less">
.cf-toolbar-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 1px solid var(--ant-color-border);
  border-radius: 2px;
  background:
    linear-gradient(var(--ant-color-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--ant-color-border) 1px, transparent 1px);
  background-size: 4px 4px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 1px;
    right: 1px;
    bottom: 1px;
    height: 4px;
    background: linear-gradient(90deg, #5b9bd5, #63c384);
    border-radius: 1px;
  }
}

.cf-toolbar-caret {
  font-size: 10px;
  margin-left: 2px;
  opacity: 0.65;
}
</style>

<style lang="less">
.sheet-cf-databar-submenu {
  .ant-dropdown-menu {
    padding: 0 !important;
    min-width: 176px;
    width: auto;
  }
}

.lake-sheet-toolbar-image-chose-wrapper {
  padding: 10px 14px 12px;
  width: 180px;
  box-sizing: border-box;

  .lake-sheet-toolbar-image-chose {
    &:not(:first-child) {
      margin-top: 10px;
    }
  }

  .lake-sheet-toolbar-image-chose-title {
    font-size: 13px;
    color: var(--ant-color-text-primary, #262626);
    line-height: 20px;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .lake-sheet-toolbar-image-chose-group {
    display: grid !important;
    grid-template-columns: repeat(3, 43px) !important;
    justify-content: space-between;
    row-gap: 8px;
  }

  .lake-sheet-toolbar-image-chose-item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .lake-sheet-toolbar-image-chose-img {
    width: 35px;
    height: 31px;
    border: 3px solid transparent;
    box-sizing: content-box;
    border-radius: 6px;
    transition: all 0.1s ease-in-out;
    cursor: pointer;

    &:hover,
    &.lake-sheet-toolbar-image-chose-img-active {
      border-color: var(--speed-color-bg-gray-3, #eff0f0);
    }
  }

  .cf-preset-bar {
    display: block;
    width: 35px;
    height: 10px;
    border-radius: 2px;
  }
}
</style>
