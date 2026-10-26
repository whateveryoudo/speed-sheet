<template>
  <a-dropdown
    v-model:open="open"
    trigger="click"
    placement="bottomLeft"
    :disabled="disableMenu"
    overlay-class-name="sheet-valign-dropdown"
  >
    <s-keymap-tip :title="disableMenu ? null : t('toolbar.verticalAlign')">
      <a-button
        type="text"
        class="shadow-btn-wrapper"
        :disabled="disableMenu"
      >
        <span class="inline-flex items-center justify-center">
          <vertical-align-top-outlined v-if="currentAlign === 1" />
          <vertical-align-bottom-outlined v-else-if="currentAlign === 2" />
          <vertical-align-middle-outlined v-else />
        </span>
        <caret-down-outlined class="dropdown-trigger" />
      </a-button>
    </s-keymap-tip>

    <template #overlay>
      <a-menu class="sheet-align-menu-panel" @click="onMenuClick">
        <a-menu-item key="1" :class="{ 'is-selected': currentAlign === 1 }">
          <div class="menu-item-inner">
            <span class="check-box">
              <check-outlined v-if="currentAlign === 1" />
            </span>
            <span class="menu-icon">
              <vertical-align-top-outlined />
            </span>
            <span class="menu-label">{{ t('toolbar.valignTop') }}</span>
          </div>
        </a-menu-item>

        <a-menu-item key="0" :class="{ 'is-selected': currentAlign === 0 }">
          <div class="menu-item-inner">
            <span class="check-box">
              <check-outlined v-if="currentAlign === 0" />
            </span>
            <span class="menu-icon">
              <vertical-align-middle-outlined />
            </span>
            <span class="menu-label">{{ t('toolbar.valignMiddle') }}</span>
          </div>
        </a-menu-item>

        <a-menu-item key="2" :class="{ 'is-selected': currentAlign === 2 }">
          <div class="menu-item-inner">
            <span class="check-box">
              <check-outlined v-if="currentAlign === 2" />
            </span>
            <span class="menu-icon">
              <vertical-align-bottom-outlined />
            </span>
            <span class="menu-label">{{ t('toolbar.valignBottom') }}</span>
          </div>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CaretDownOutlined,
  CheckOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const open = ref(false)
const { t } = useI18n()
const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

const disableMenu = computed(() => !editableCpt.value)

// 0: middle, 1: top, 2: bottom
const currentAlign = computed<0 | 1 | 2>(() => {
  const vt = activeCell.value?.vt
  if (vt === 1 || vt === 2) return vt
  return 0
})

function onMenuClick(info: any) {
  const align = Number(info?.key) as 0 | 1 | 2
  if (!sheet.value) return
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setVerticalAlign({ r, c, align }).run()
  })
  open.value = false
}
</script>

<style lang="less">
.sheet-valign-dropdown {
  .sheet-align-menu-panel {
    min-width: 130px;
    padding: 4px 0;

    .ant-dropdown-menu-item {
      padding: 6px 12px;
      line-height: 22px;
    }

    .menu-item-inner {
      display: flex;
      align-items: center;
      color: #333;

      .check-box {
        width: 18px;
        font-size: 12px;
        display: flex;
        align-items: center;
      }

      .menu-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-right: 8px;
        color: #555;
      }

      .menu-label {
        flex: 1;
      }
    }
  }
}
</style>
