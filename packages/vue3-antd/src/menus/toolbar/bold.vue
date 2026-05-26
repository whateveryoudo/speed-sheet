<template>
  <s-keymap-tip :title="editableCpt ? t('toolbar.bold') : null" :key-map="keyMap">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :class="{ 'is-active': isBoldActive }"
      :disabled="!editableCpt"
      @click="toggleBold"
    >
      <bold-outlined />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BoldOutlined } from '@ant-design/icons-vue'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const keyMap = getShortcutTipByKey('bold')
const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

const isBoldActive = computed(() => activeCell.value?.bl === 1)

function toggleBold() {
  if (!sheet.value) return
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setBold({ r, c }).run()
  })
}
</script>
