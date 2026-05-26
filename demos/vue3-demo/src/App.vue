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
    name: 'SheetA',
    index: '0',
    celldata: [
      { r: 0, c: 0, v: { v: 10, m: '10' } },
      { r: 1, c: 0, v: { v: 20, m: '20' } },
      { r: 2, c: 0, v: { v: 30, m: '30' } },
      { r: 0, c: 2, v: { f: '=A1+B1', v: 30, m: '30' } },
      { r: 1, c: 2, v: { f: '=SUM(A1:A3)', v: 60, m: '60' } },
    ],
  },
  {
    name: 'SheetB',
    index: '1',
    celldata: [{ r: 12, c: 3, v: { v: 99, m: '99' } }],
  },
])

function onChange(data: LuckysheetFile): void {
  sheetData.value = data
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
.sheet-wrapper { width: 100vw; height: 100vh; }
</style>
