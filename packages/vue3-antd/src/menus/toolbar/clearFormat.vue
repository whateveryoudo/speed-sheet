<template>
  <s-keymap-tip :title="disableMenu ? null : t('toolbar.clearFormat')" :key-map="keyMap">
    <a-button
      class="shadow-btn-wrapper"
      :disabled="disableMenu"
      type="text"
      @click="clear"
    >
      <s-icon-font type="icon-kl-remove-format" :size="16" />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const keyMap = getShortcutTipByKey('clearFormat')
const { sheet, editableCpt, forEachSelectedCell } = useSheetToolbar()

const disableMenu = computed(() => !editableCpt.value)

function clear() {
  if (!sheet.value) return
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().clearCellFormat({ r, c }).run()
  })
}
</script>
