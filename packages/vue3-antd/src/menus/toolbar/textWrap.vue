<template>
  <a-dropdown v-model:open="open" trigger="click" placement="bottomLeft" :disabled="disableMenu"
    overlay-class-name="sheet-textwrap-dropdown">
    <s-keymap-tip :title="disableMenu ? null : t('toolbar.textWrap')">
      <a-button type="text" class="shadow-btn-wrapper" :disabled="disableMenu">
        <span class="inline-flex items-center justify-center">
          <s-icon-font :type="currentWrapIconType" />
        </span>
        <caret-down-outlined class="dropdown-trigger" />
      </a-button>
    </s-keymap-tip>

    <template #overlay>
      <a-menu class="sheet-wrap-menu-panel" @click="onMenuClick">
        <!-- 溢出 (1) -->
        <a-menu-item key="1" :class="{ 'is-selected': currentWrap === 1 }">
          <div class="menu-item-inner">
            <span class="check-box">
              <check-outlined v-if="currentWrap === 1" />
            </span>
            <s-icon-font type="icon-kl-overflow" class="mr-2" />
            <span class="menu-label">{{ t('toolbar.wrapOverflow') }}</span>
          </div>
        </a-menu-item>

        <!-- 截断 (0) -->
        <a-menu-item key="0" :class="{ 'is-selected': currentWrap === 0 }">
          <div class="menu-item-inner">
            <span class="check-box">
              <check-outlined v-if="currentWrap === 0" />
            </span>
            <s-icon-font type="icon-kl-clip" class="mr-2" />
            <span class="menu-label">{{ t('toolbar.wrapClip') }}</span>
          </div>
        </a-menu-item>

        <!-- 换行 (2) -->
        <a-menu-item key="2" :class="{ 'is-selected': currentWrap === 2 }">
          <div class="menu-item-inner">
            <span class="check-box">
              <check-outlined v-if="currentWrap === 2" />
            </span>
            <s-icon-font type="icon-kl-wrap" class="mr-2" />
            <span class="menu-label">{{ t('toolbar.wrapWrap') }}</span>
          </div>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CaretDownOutlined, CheckOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const open = ref(false)
const { t } = useI18n()
const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

const disableMenu = computed(() => !editableCpt.value)

// tb: 0: 截断, 1: 溢出, 2: 换行。默认溢出 (1)
const currentWrap = computed<0 | 1 | 2>(() => {
  const tb = activeCell.value?.tb
  if (tb === 0 || tb === 2) return tb
  return 1
})

const currentWrapIconType = computed(() => {
  if (currentWrap.value === 0) {
    return 'icon-kl-clip'
  }
  if (currentWrap.value === 2) {
    return 'icon-kl-wrap'
  }
  return 'icon-kl-overflow'
})

function onMenuClick(info: any) {
  const wrap = Number(info?.key) as 0 | 1 | 2
  if (!sheet.value) return
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setTextWrap({ r, c, wrap }).run()
  })
  open.value = false
}
</script>

<style lang="less">
.sheet-textwrap-dropdown {
  .sheet-wrap-menu-panel {
    min-width: 100px;
    padding: 4px 0;

    .ant-dropdown-menu-item {
      padding: 6px 12px;
      line-height: 22px;
    }

    .menu-item-inner {
      display: flex;
      align-items: center;
      font-size: 13px;
      color: #333;

      .check-box {
        width: 18px;
        font-size: 12px;
        color: var(--ant-primary-color, #1890ff);
        display: flex;
        align-items: center;
      }
      .menu-label {
        flex: 1;
      }
    }
  }
}
</style>
