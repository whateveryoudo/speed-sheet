<template>
  <div class="decimal-places-group">
    <!-- 增加小数位数 -->
    <s-keymap-tip :title="editableCpt ? t('toolbar.increaseDecimal') : null">
      <a-button
        type="text"
        class="shadow-btn-wrapper decimal-btn"
        :disabled="!editableCpt"
        @click="increaseDecimal"
      >
        <svg class="decimal-icon" viewBox="0 0 24 24" fill="currentColor">
          <text x="2" y="10" font-size="12" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif">.00</text>
          <path transform="translate(2, 0)" d="M3 17h12M12 14l3.5 3-3.5 3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a-button>
    </s-keymap-tip>

    <!-- 减少小数位数 -->
    <s-keymap-tip :title="editableCpt ? t('toolbar.decreaseDecimal') : null">
      <a-button
        type="text"
        class="shadow-btn-wrapper decimal-btn"
        :disabled="!editableCpt"
        @click="decreaseDecimal"
      >
        <svg class="decimal-icon" viewBox="0 0 24 24" fill="currentColor">
          <text x="2" y="10" font-size="12" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif">.00</text>
          <path transform="translate(2, 0)" d="M17 17H5M8 14l-3.5 3 3.5 3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a-button>
    </s-keymap-tip>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const { sheet, editableCpt, forEachSelectedCell, commitActiveEditor } = useSheetToolbar()

function increaseDecimal() {
  if (!sheet.value) return
  commitActiveEditor?.()
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().changeDecimalPlaces({ r, c, delta: 1 }).run()
  })
}

function decreaseDecimal() {
  if (!sheet.value) return
  commitActiveEditor?.()
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().changeDecimalPlaces({ r, c, delta: -1 }).run()
  })
}
</script>

<style scoped lang="less">
.decimal-places-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.decimal-btn {
  padding: 0 4px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.decimal-icon {
  width: 18px;
  height: 18px;
}
</style>
