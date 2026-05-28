<template>
  <div class="sheet-wrapper">
    <SpeedSheet :sheet-data="sheetData" :show-toolbar="true" :show-sheet-tabs="true" :show-formula-bar="true" lang="zh"
      :on-change="onChange" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SpeedSheet } from '@speed-sheet/vue3-antd'
import { luckysheetFileToSnapshot } from '@speed-sheet/core'
import type { WorkbookSnapshot } from '@speed-sheet/shared'
import type { LuckysheetFile } from '@speed-sheet/shared'

/** 仅用于生成初始 snapshot；日常存盘/onChange 请用 WorkbookSnapshot */
// const seedLuckysheet: LuckysheetFile = [
//   {
//     name: 'SheetA',
//     index: '0',
//     celldata: [
//       { r: 0, c: 0, v: { v: 10, m: '10' } },
//       { r: 1, c: 0, v: { v: 20, m: '20' } },
//       { r: 2, c: 0, v: { v: 30, m: '30' } },
//       { r: 0, c: 2, v: { f: '=A1+B1', v: 30, m: '30' } },
//       { r: 1, c: 2, v: { f: '=SUM(A1:A3)', v: 60, m: '60' } },
//     ],
//   },
//   {
//     name: 'SheetB',
//     index: '1',
//     celldata: [{ r: 12, c: 3, v: { v: 99, m: '99' } }],
//   },
// ]
const sheetData = ref<WorkbookSnapshot>({
  sheets: [
    {
      name: 'SheetA',
      id: '0',
      order: 0,
      cells: {},
      rowOrder: [],
      colOrder: [],
      config: {
        merges: {},
        rowHeight: {},
        colWidth: {},
        rowHidden: {},
        colHidden: {},
        borders: [],
        filters: [],
        freeze: {}
      }
    },
  ],
  activeSheetId: '0',
  version: 2,
})
// const sheetData = ref<WorkbookSnapshot>(luckysheetFileToSnapshot(seedLuckysheet))

function onChange(snapshot: WorkbookSnapshot): void {
  console.log('[WorkbookSnapshot]', snapshot)
  sheetData.value = snapshot
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.sheet-wrapper {
  width: 100vw;
  height: 100vh;
}
</style>
