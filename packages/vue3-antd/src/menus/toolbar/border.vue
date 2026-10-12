<template>
  <s-keymap-tip :title="disableMenu ? null : t('toolbar.border')">
    <div class="flex items-center">
      <!-- Quick Border Button (Apply All Border with current color and style) -->
      <a-button
        type="text"
        class="shadow-btn-wrapper middle -mt-1px"
        :disabled="disableMenu"
        @click="applyBorder('all')"
      >
        <span class="relative flex flex-col text-16px items-center justify-center">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M3 3h18v18H3V3zm2 2v6h6V5H5zm8 0v6h6V5h-6zm-8 8v6h6v-6H5zm8 0v6h6v-6h-6z" />
          </svg>
          <span
            class="absolute bottom-[-1px] h-2px w-110% left-[-5%]"
            :style="{ backgroundColor: (disableMenu ? 'rgba(0,0,0,0.25)' : curColor || '#000000') as string }"
          />
        </span>
      </a-button>

      <!-- Dropdown Popover for Border Types, Color, Style -->
      <a-popover
        v-if="!disableMenu"
        v-model:open="popoverOpen"
        trigger="click"
        placement="bottomLeft"
        overlay-class-name="sheet-border-popover-wrapper"
      >
        <template #content>
          <div class="sheet-border-panel">
            <!-- 10 Border Types Grid -->
            <div class="border-types-grid">
              <div
                v-for="item in borderTypes"
                :key="item.type"
                class="border-type-btn"
                :title="t(`toolbar.${item.labelKey}`)"
                @click="onSelectBorderType(item.type)"
              >
                <component :is="item.icon" />
              </div>
            </div>

            <div class="border-divider" />

            <!-- Line Color Option -->
            <a-popover
              trigger="click"
              placement="rightTop"
              overlay-class-name="color-board-popover-wrapper"
            >
              <template #content>
                <ColorBoard
                  :cur-color="curColor"
                  show-default
                  @pick="onPickColor"
                />
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
            <a-popover
              trigger="click"
              placement="rightTop"
              overlay-class-name="border-style-popover-wrapper"
            >
              <template #content>
                <div class="border-styles-list">
                  <div
                    v-for="s in styleOptions"
                    :key="s.style"
                    class="border-style-item"
                    :class="{ 'is-selected': curStyle === s.style }"
                    @click="onPickStyle(s.style)"
                  >
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

        <a-button
          type="text"
          class="shadow-btn-wrapper small dropdown-trigger"
          :disabled="disableMenu"
          @mousedown.prevent
        >
          <caret-down-outlined />
        </a-button>
      </a-popover>

      <a-button
        v-else
        type="text"
        class="shadow-btn-wrapper small dropdown-trigger"
        disabled
      >
        <caret-down-outlined />
      </a-button>
    </div>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import {
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

function renderSvgIcon(path: string) {
  return () =>
    h(
      'svg',
      {
        viewBox: '0 0 24 24',
        width: 18,
        height: 18,
        fill: 'currentColor',
      },
      [h('path', { d: path })],
    )
}

const borderTypes = [
  {
    type: 'all' as BorderType,
    labelKey: 'borderAll',
    icon: renderSvgIcon('M3 3h18v18H3V3zm2 2v6h6V5H5zm8 0v6h6V5h-6zm-8 8v6h6v-6H5zm8 0v6h6v-6h-6z'),
  },
  {
    type: 'inside' as BorderType,
    labelKey: 'borderInside',
    icon: renderSvgIcon('M11 3h2v8h8v2h-8v8h-2v-8H3v-2h8V3z'),
  },
  {
    type: 'horizontal' as BorderType,
    labelKey: 'borderHorizontal',
    icon: renderSvgIcon('M3 11h18v2H3v-2z'),
  },
  {
    type: 'vertical' as BorderType,
    labelKey: 'borderVertical',
    icon: renderSvgIcon('M11 3h2v18h-2V3z'),
  },
  {
    type: 'outside' as BorderType,
    labelKey: 'borderOutside',
    icon: renderSvgIcon('M3 3h18v18H3V3zm2 2v14h14V5H5z'),
  },
  {
    type: 'left' as BorderType,
    labelKey: 'borderLeft',
    icon: renderSvgIcon('M3 3h2v18H3V3z'),
  },
  {
    type: 'top' as BorderType,
    labelKey: 'borderTop',
    icon: renderSvgIcon('M3 3h18v2H3V3z'),
  },
  {
    type: 'right' as BorderType,
    labelKey: 'borderRight',
    icon: renderSvgIcon('M19 3h2v18h-2V3z'),
  },
  {
    type: 'bottom' as BorderType,
    labelKey: 'borderBottom',
    icon: renderSvgIcon('M3 19h18v2H3v-2z'),
  },
  {
    type: 'none' as BorderType,
    labelKey: 'borderNone',
    icon: renderSvgIcon('M4 4h2v2H4V4zm4 0h2v2H8V4zm4 0h2v2h-2V4zm4 0h2v2h-2V4zm4 0h2v2h-2V4zM4 20h2v2H4v-2zm4 0h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM4 8h2v2H4V8zm0 4h2v2H4v-2zm0 4h2v2H4v-2zm16-8h2v2h-2V8zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z'),
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
