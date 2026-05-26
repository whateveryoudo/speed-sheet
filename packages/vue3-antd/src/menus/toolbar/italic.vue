<template>
  <s-keymap-tip :title="editableCpt ? t('toolbar.italic') : null" :key-map="keyMap">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :class="{ 'is-active': isItalicActive }"
      :disabled="!editableCpt"
      @click="toggleItalic"
    >
      <italic-outlined />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ItalicOutlined } from '@ant-design/icons-vue'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const keyMap = getShortcutTipByKey('italic')
const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

const isItalicActive = computed(() => activeCell.value?.it === 1)

function toggleItalic() {
  if (!sheet.value) return
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setItalic({ r, c }).run()
  })
}
</script>
