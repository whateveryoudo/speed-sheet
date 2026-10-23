# Luckysheet 兼容与迁移指南

原版 [Luckysheet](https://github.com/dream-num/Luckysheet) 官方已明确宣布停止维护。为了让广大基于 Luckysheet 沉淀了海量业务数据的团队能够无缝升级，Speed Sheet 提供了**零迁移成本的开箱即用兼容方案**。

---

## 零侵入平替方案

你不需要编写任何清洗脚本或重构数据库中的已有表格 JSON，直接使用 `:luckysheet-data` 即可：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SpeedSheet } from '@speed-sheet/vue3-antd'
import type { LuckysheetFile } from '@speed-sheet/shared'

// 1. 直接读取你的老版 Luckysheet 数据（无论二维数组还是 celldata 格式）
const oldData = ref<LuckysheetFile>({
  name: '财务报表',
  data: [
    ['项目', '2024预算', '2024实际支出'],
    ['技术研发', 500000, 480000],
    ['运营推广', 200000, 210000],
  ],
})

// 2. 数据更新时，组件支持直接以 Luckysheet 兼容结构回传给宿主
const onSaveLuckysheet = (data: LuckysheetFile) => {
  console.log('保存 Luckysheet 兼容结构:', data)
  // 直接回存到你原来的数据库字段中，后端接口一行都不用改！
}
</script>

<template>
  <div style="width: 100vw; height: 100vh;">
    <SpeedSheet
      :luckysheet-data="oldData"
      :show-toolbar="true"
      :show-formula-bar="true"
      @luckysheet-change="onSaveLuckysheet"
    />
  </div>
</template>
```

---

## 核心转换工具函数

如果你需要在纯 JS / 后端 Node 环境中进行数据结构互转，`@speed-sheet/core` 提供了轻量独立的互转函数：

```ts
import { luckysheetFileToSnapshot } from '@speed-sheet/core'

// 将 Luckysheet 文件数据转换为 Speed Sheet 原生快照 (WorkbookSnapshot)
const snapshot = luckysheetFileToSnapshot(rawLuckysheetFile)
```

---

## 升级收益对比

| 对比维度 | 原版 Luckysheet | Speed Sheet |
| :--- | :--- | :--- |
| **项目状态** | ❌ 官方已停更 | ✅ 持续活跃迭代 |
| **底层渲染** | DOM + Canvas 混合 | 纯 Canvas 极速视口调度 |
| **多人协同** | 需侵入式魔改内部 websocket | 原生集成 Yjs CRDT（仅传一个 ydoc） |
| **技术栈** | jQuery 遗留，现代框架集成难 | 原生 Vue 3 + TypeScript + Ant Design |
| **扩展机制** | 内部硬编码改源码 | TipTap 风格可插拔 Extension 命令链 |
