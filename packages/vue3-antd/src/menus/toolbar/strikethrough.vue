<template>
  <s-keymap-tip :title="editableCpt ? t('toolbar.strikethrough') : null" :key-map="keyMap">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :class="{ 'is-active': isStrikethroughActive }"
      :disabled="!editableCpt"
      @click="toggleStrikethrough"
    >
      <strikethrough-outlined />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { StrikethroughOutlined } from '@ant-design/icons-vue'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const keyMap = getShortcutTipByKey('strikethrough')
const { sheet, editableCpt, activeCell, forEachSelectedCell, commitActiveEditor } = useSheetToolbar()

const isStrikethroughActive = computed(() => activeCell.value?.cl === 1)

function toggleStrikethrough() {
  if (!sheet.value) return
  commitActiveEditor?.()
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setStrikethrough({ r, c }).run()
  })
}
</script>
