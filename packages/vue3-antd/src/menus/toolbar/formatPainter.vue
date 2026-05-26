<template>
  <s-keymap-tip :title="editableCpt ? t('toolbar.formatPainter') : null" :key-map="keyMap">
    <a-button
      class="shadow-btn-wrapper"
      type="text"
      :class="{ 'is-active': formatPainterActive }"
      :disabled="!editableCpt"
      @click="toggleFormatPainter"
    >
      <clear-outlined style="font-size: 16px" />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { ClearOutlined } from '@ant-design/icons-vue'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const keyMap = getShortcutTipByKey('formatPainter')
const {
  editableCpt,
  formatPainterActive,
  copiedStyle,
  activeCell,
  pickStyle,
} = useSheetToolbar()

function toggleFormatPainter() {
  if (formatPainterActive.value) {
    formatPainterActive.value = false
    copiedStyle.value = null
    return
  }
  if (!activeCell.value) return
  copiedStyle.value = pickStyle(activeCell.value)
  formatPainterActive.value = true
  message.info(t('toolbar.formatPainterHint'))
}
</script>
