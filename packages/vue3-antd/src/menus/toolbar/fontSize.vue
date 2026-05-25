<template>
  <a-select
    :bordered="false"
    class="w-[80px] shadow-ant-select"
    :value="currentFontSize"
    :disabled="!editableCpt"
    popup-class-name="popover-check-dropdown"
    :options="fontSizeOptions"
    @change="handleChange"
  >
    <template #suffixIcon>
      <caret-down-outlined />
    </template>
  </a-select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CaretDownOutlined } from '@ant-design/icons-vue'
import type { SelectValue } from 'ant-design-vue/es/select'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

const currentFontSize = computed(() => activeCell.value?.fs ?? 11)

const fontSizeOptions = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36,
].map((s) => ({ value: s, label: String(s) }))

function handleChange(value: SelectValue) {
  const size = typeof value === 'number' ? value : Number(value)
  if (!sheet.value || Number.isNaN(size)) return
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setFontSize({ r, c, size }).run()
  })
}
</script>
