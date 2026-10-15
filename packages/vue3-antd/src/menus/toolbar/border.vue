<template>
  <s-keymap-tip :title="disableMenu ? null : t('toolbar.border')">
    <div class="flex items-center">
      <!-- Quick Border Button (Apply All Border with current color and style) -->
      <a-button type="text" class="shadow-btn-wrapper middle -mt-1px" :disabled="disableMenu"
        @click="applyBorder('all')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M3 3h18v18H3V3zm2 2v6h6V5H5zm8 0v6h6V5h-6zm-8 8v6h6v-6H5zm8 0v6h6v-6h-6z" />
        </svg>
      </a-button>

      <!-- Dropdown Popover for Border Types, Color, Style -->
      <a-popover v-if="!disableMenu" v-model:open="popoverOpen" trigger="click" placement="bottomLeft"
        overlay-class-name="sheet-border-popover-wrapper">
        <template #content>
          <div class="sheet-border-panel">
            <!-- 10 Border Types Grid -->
            <div class="border-types-grid">
              <div v-for="item in borderTypes" :key="item.type" class="border-type-btn"
                :title="t(`toolbar.${item.labelKey}`)" @click="onSelectBorderType(item.type)">
                <component :is="item.icon" />
              </div>
            </div>

            <div class="border-divider" />

            <!-- Line Color Option -->
            <a-popover trigger="click" placement="rightTop" overlay-class-name="color-board-popover-wrapper">
              <template #content>
                <ColorBoard :cur-color="curColor" show-default @pick="onPickColor" />
              </template>
              <div class="border-setting-row">
                <span class="row-label">{{ t('toolbar.borderColor') }}</span>
                <span class="row-value-preview">
                  <span class="color-badge" :style="{ backgroundColor: (curColor || '#000000') as string }" />
                  <right-outlined class="arrow-icon" />
                </span>
              </div>
            </a-popover>

            <!-- Line Style Option -->
            <a-popover trigger="click" placement="rightTop" overlay-class-name="border-style-popover-wrapper">
              <template #content>
                <div class="border-styles-list">
                  <div v-for="s in styleOptions" :key="s.style" class="border-style-item"
                    :class="{ 'is-selected': curStyle === s.style }" @click="onPickStyle(s.style)">
                    <span class="style-line" :class="s.lineClass" />
                    <check-outlined v-if="curStyle === s.style" class="check-icon" />
                  </div>
                </div>
              </template>
              <div class="border-setting-row">
                <span class="row-label">{{ t('toolbar.borderStyle') }}</span>
                <span class="row-value-preview">
                  <span class="style-line-preview" :class="currentStyleClass" />
                  <right-outlined class="arrow-icon" />
                </span>
              </div>
            </a-popover>
          </div>
        </template>

        <a-button type="text" class="shadow-btn-wrapper small dropdown-trigger" :disabled="disableMenu"
          @mousedown.prevent>
          <caret-down-outlined />
        </a-button>
      </a-popover>

      <a-button v-else type="text" class="shadow-btn-wrapper small dropdown-trigger" disabled>
        <caret-down-outlined />
      </a-button>
    </div>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BorderBottomOutlined,
  BorderHorizontalOutlined,
  BorderInnerOutlined,
  BorderLeftOutlined,
  BorderOuterOutlined,
  BorderRightOutlined,
  BorderTopOutlined,
  BorderVerticleOutlined,
  CaretDownOutlined,
  RightOutlined,
  CheckOutlined,
} from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import ColorBoard from './colorPicker/ColorBoard.vue'
import type { ColorType } from './colorPicker/data'
import type { BorderType } from '@speed-sheet/core'

const { t } = useI18n()
const { sheet, editableCpt } = useSheetToolbar()

const popoverOpen = ref(false)
const curColor = ref<ColorType>('#000000')
const curStyle = ref<number>(1) // 1: thin, 8: medium, 4: dashed

const disableMenu = computed(() => !editableCpt.value)

const currentStyleClass = computed(() => {
  if (curStyle.value === 8) return 'line-medium'
  if (curStyle.value === 4) return 'line-dashed'
  return 'line-thin'
})

const styleOptions = [
  { style: 1, lineClass: 'line-thin', labelKey: 'borderThin' },
  { style: 8, lineClass: 'line-medium', labelKey: 'borderMedium' },
  { style: 4, lineClass: 'line-dashed', labelKey: 'borderDashed' },
]

function renderAntdSvg(path: string) {
  return () =>
    h(
      'span',
      { class: 'anticon' },
      [
        h(
          'svg',
          {
            viewBox: '64 64 896 896',
            width: '1em',
            height: '1em',
            fill: 'currentColor',
            focusable: 'false',
            'aria-hidden': 'true',
          },
          [h('path', { d: path })],
        ),
      ],
    )
}

// 与 Ant Design Border 系列同规格田字格全边框（外实线框 + 内十字实线）
const AllBorderIcon = renderAntdSvg(
  'M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-40 728H184V184h656v656zM872 476H548V144h-72v332H152c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h324v332h72V548h324c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8z',
)

// 与 Ant Design Border 点阵同规格的纯点阵无边框
const NoneBorderIcon = renderAntdSvg(
  'M650 216h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm56 592h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm-332 0h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm-56-592h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm-166 0h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm56 592h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm-56-426h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm56 260h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zM484 366h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8M302 548h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm364 0h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm-182 0h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm0 182h56c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8z',
)

const borderTypes = [
  {
    type: 'all' as BorderType,
    labelKey: 'borderAll',
    icon: AllBorderIcon,
  },
  {
    type: 'inside' as BorderType,
    labelKey: 'borderInside',
    icon: BorderInnerOutlined,
  },
  {
    type: 'horizontal' as BorderType,
    labelKey: 'borderHorizontal',
    icon: BorderHorizontalOutlined,
  },
  {
    type: 'vertical' as BorderType,
    labelKey: 'borderVertical',
    icon: BorderVerticleOutlined,
  },
  {
    type: 'outside' as BorderType,
    labelKey: 'borderOutside',
    icon: BorderOuterOutlined,
  },
  {
    type: 'left' as BorderType,
    labelKey: 'borderLeft',
    icon: BorderLeftOutlined,
  },
  {
    type: 'top' as BorderType,
    labelKey: 'borderTop',
    icon: BorderTopOutlined,
  },
  {
    type: 'right' as BorderType,
    labelKey: 'borderRight',
    icon: BorderRightOutlined,
  },
  {
    type: 'bottom' as BorderType,
    labelKey: 'borderBottom',
    icon: BorderBottomOutlined,
  },
  {
    type: 'none' as BorderType,
    labelKey: 'borderNone',
    icon: NoneBorderIcon,
  },
]

function applyBorder(type: BorderType) {
  if (!sheet.value) return
  sheet.value
    .chain()
    .setBorder({
      borderType: type,
      color: (curColor.value as string) || '#000000',
      style: curStyle.value,
    })
    .run()
}

function onSelectBorderType(type: BorderType) {
  applyBorder(type)
  popoverOpen.value = false
}

function onPickColor(color: ColorType) {
  curColor.value = color || '#000000'
}

function onPickStyle(style: number) {
  curStyle.value = style
}
</script>

<style lang="less">
.sheet-border-popover-wrapper {
  .ant-popover-inner {
    padding: 8px;
  }
}

.sheet-border-panel {
  width: 172px;

  .border-types-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    padding-bottom: 6px;

    .border-type-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      color: #333;
      transition: background 0.15s;

      &:hover {
        background-color: var(--speed-color-bg-gray-1, rgba(0, 0, 0, 0.06));
      }
    }
  }

  .border-divider {
    height: 1px;
    background-color: var(--speed-color-border-gray, #e8e8e8);
    margin: 4px 0 6px 0;
  }

  .border-setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    color: #333;
    transition: background 0.15s;

    &:hover {
      background-color: var(--speed-color-bg-gray-1, rgba(0, 0, 0, 0.06));
    }

    .row-value-preview {
      display: flex;
      align-items: center;
      gap: 6px;

      .color-badge {
        width: 16px;
        height: 16px;
        border-radius: 2px;
        border: 1px solid rgba(0, 0, 0, 0.15);
      }

      .style-line-preview {
        width: 32px;
        height: 0px;
        display: inline-block;

        &.line-thin {
          border-bottom: 1px solid #333;
        }

        &.line-medium {
          border-bottom: 2px solid #333;
        }

        &.line-dashed {
          border-bottom: 1px dashed #333;
        }
      }

      .arrow-icon {
        font-size: 11px;
        color: #999;
      }
    }
  }
}

.border-style-popover-wrapper {
  .ant-popover-inner {
    padding: 6px 0;
  }

  .border-styles-list {
    width: 140px;

    .border-style-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      cursor: pointer;
      transition: background 0.15s;

      &:hover {
        background-color: var(--speed-color-bg-gray-1, rgba(0, 0, 0, 0.06));
      }

      &.is-selected {
        font-weight: 500;
      }

      .style-line {
        width: 80px;
        height: 0;

        &.line-thin {
          border-bottom: 1px solid #333;
        }

        &.line-medium {
          border-bottom: 2px solid #333;
        }

        &.line-dashed {
          border-bottom: 1px dashed #333;
        }
      }

      .check-icon {
        font-size: 12px;
        color: var(--ant-primary-color, #1890ff);
      }
    }
  }
}
</style>
