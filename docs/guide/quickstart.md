# 快速开始

只需几步，即可在你的 Vue 3 项目中运行起 Speed Sheet。

---

## 1. 安装依赖

```bash
# 安装开箱即用 UI 组件包
pnpm add @speed-sheet/vue3-antd

# 安装核心依赖（若宿主尚未安装）
pnpm add @speed-sheet/core @speed-sheet/shared vue ant-design-vue
```

---

## 2. 基础代码示例

在组件中引入 `<SpeedSheet />`：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SpeedSheet } from '@speed-sheet/vue3-antd'
import type { WorkbookSnapshot } from '@speed-sheet/shared'

// 表格数据变更回调
const handleSheetChange = (snapshot: WorkbookSnapshot) => {
  console.log('表格更新:', snapshot)
}
</script>

<template>
  <div style="width: 100vw; height: 100vh;">
    <SpeedSheet
      :show-toolbar="true"
      :show-formula-bar="true"
      :show-sheet-tabs="true"
      @change="handleSheetChange"
    />
  </div>
</template>

<style>
/* 保证父容器有固定宽高 */
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
```

---

## 3. 三大运行形态

* **单机本地模式**：直接传入 `:sheet-data="mySnapshot"` 即可；
* **多人实时协同模式**：额外多传入 `:ydoc="myYdoc"` 即可自动接入协同；
* **纯静态查看态**：设置 `:editable="false"` 即可屏蔽工具栏，纯静态秒开渲染。
