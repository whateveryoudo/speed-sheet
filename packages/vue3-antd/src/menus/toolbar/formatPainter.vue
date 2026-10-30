<template>
  <s-keymap-tip :title="editableCpt ? tipText : null" :key-map="keyMap">
    <a-button
      class="shadow-btn-wrapper"
      type="text"
      :class="{ 'is-active': formatPainterActive }"
      :disabled="!editableCpt"
      @click="handleClick"
      @dblclick="handleDblClick"
    >
      <s-icon-font type="icon-kl-format-painter" style="font-size: 16px;" />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const keyMap = getShortcutTipByKey('formatPainter')
const {
  editableCpt,
  formatPainterActive,
  formatPainterMode,
  copiedStyle,
  activeCell,
  pickStyle,
} = useSheetToolbar()

const tipText = computed(() => {
  return `${t('toolbar.formatPainter')}\n${t('toolbar.formatPainterTip')}`
})

let clickTimer: ReturnType<typeof setTimeout> | null = null

function handleClick() {
  // 如果当前已激活（不论是单次还是连续），再次单击立即取消退出
  if (formatPainterActive.value) {
    if (clickTimer) {
      clearTimeout(clickTimer)
      clickTimer = null
    }
    if (formatPainterMode) formatPainterMode.value = 'none'
    else formatPainterActive.value = false
    copiedStyle.value = null
    return
  }

  if (!activeCell.value) return
  // 延迟 220ms 区分单击与双击
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    clickTimer = null
    copiedStyle.value = pickStyle(activeCell.value!)
    if (formatPainterMode) formatPainterMode.value = 'single'
    else formatPainterActive.value = true
    message.info(t('toolbar.formatPainterHint'))
  }, 220)
}

function handleDblClick() {
  // 快速双击：取消单击定时器，直接开启连续模式
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }
  if (!activeCell.value) return
  copiedStyle.value = pickStyle(activeCell.value)
  if (formatPainterMode) formatPainterMode.value = 'continuous'
  else formatPainterActive.value = true
  message.info(t('toolbar.formatPainterContinuousHint'))
}

onBeforeUnmount(() => {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }
})
</script>
