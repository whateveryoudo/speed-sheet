<template>
  <div class="sheet-wrapper">
    <SpeedSheet
      :sheet-data="sheetData"
      :show-toolbar="true"
      :show-sheet-tabs="true"
      :show-formula-bar="true"
      lang="zh"
      :on-change="onChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SpeedSheet } from '@speed-sheet/vue3-antd'
import type { LuckysheetFile } from '@speed-sheet/shared'

const sheetData = ref<LuckysheetFile>([
  {
    name: 'Sheet1',
    index: 0,
    celldata: [
      { r: 0, c: 0, v: { v: 'Hello speed-sheet', m: 'Hello speed-sheet' } },
    ],
  },
])

function onChange(data: LuckysheetFile): void {
  sheetData.value = data
  console.log('[demo] onChange', data)
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
.sheet-wrapper { width: 100vw; height: 100vh; }
</style>
