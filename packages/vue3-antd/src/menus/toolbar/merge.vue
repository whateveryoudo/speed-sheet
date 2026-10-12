<template>
  <s-keymap-tip :title="editableCpt ? tooltipText : null">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :class="{ 'is-active': isMergedActive }"
      :disabled="!editableCpt"
      @click="toggleMerge"
    >
      <span class="inline-flex items-center justify-center text-16px">
        <merge-cells-outlined />
      </span>
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MergeCellsOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const { sheet, editableCpt, selection } = useSheetToolbar()

const isMergedActive = computed(() => {
  if (!sheet.value || !selection.value) return false
  const mc = sheet.value.createMergeContext()
  const active = mc.mergeAtFocus(selection.value)
  return !!active
})

const tooltipText = computed(() => {
  return isMergedActive.value ? t('toolbar.unmerge') : t('toolbar.merge')
})

function toggleMerge() {
  if (!sheet.value) return
  if (isMergedActive.value) {
    sheet.value.chain().unmergeCells().run()
  } else {
    sheet.value.chain().mergeCells().run()
  }
}
</script>
