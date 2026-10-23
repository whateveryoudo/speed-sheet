# 扩展插件体系与自定义开发

Speed Sheet 借鉴了现代编辑器（如 TipTap）的声明式插件体系设计。开发者可以通过简单的插件规范，为表格注入**自定义命令、响应式状态、覆盖层视图（Overlay Canvas/DOM）**以及**自定义工具栏/右键菜单按钮**。

---

## 插件体系设计理念

传统的表格（如老版 Luckysheet）功能多为硬编码或直接侵入全局主包，不易剪裁也不利于二次开发。

Speed Sheet 的扩展设计原则：
1. **轻量解耦**：核心只负责视口渲染与网格事件调度，图表、水印、批注、条件格式均以扩展插件形式挂载；
2. **极简 API**：与 TipTap 风格一致的 `Extension.create({...})` 链式调用，天然具备类型提示；
3. **视图互通**：支持通过 `VueSheetOverlayRenderer` 将 Vue3 自定义组件无缝挂载为表格浮层。

---

## 内置扩展插件速查

Speed Sheet 官方生态提供了一批开箱即用的扩展：

| 插件包名 | 描述 |
| :--- | :--- |
| `@speed-sheet/extension-formula` | 内置公式计算引擎（SUM, AVERAGE, VLOOKUP, IF 等） |
| `@speed-sheet/extension-filter` | 数据筛选与排序功能扩展 |
| `@speed-sheet/extension-chart` | 基于 ECharts / Canvas 的表格动态图表嵌入 |
| `@speed-sheet/extension-conditional-format` | 条件格式高亮与规则计算 |
| `@speed-sheet/extension-image` | 单元格浮动图片与资源插入 |
| `@speed-sheet/extension-import-export` | Excel (.xlsx) / CSV 文件的导入与导出 |
| `@speed-sheet/extension-protection` | 工作表保护与单元格锁定权限管理 |

---

## 自定义插件开发示例：动态水印

以下演示如何开发一个 **水印插件 (WatermarkExtension)**，支持在表格视口上方渲染倾斜文字水印，并提供控制命令与工具栏开关。

### 1. 定义插件逻辑 (`watermark.ts`)

```typescript
import { Extension, VueSheetOverlayRenderer } from '@speed-sheet/vue3-antd'
import WatermarkLayer from './WatermarkLayer.vue'
import WatermarkToolbarButton from './WatermarkToolbarButton.vue'

export interface WatermarkOptions {
  text?: string
  color?: string
  fontSize?: number
}

export interface WatermarkStorage {
  visible: boolean
  text: string
}

export const WatermarkExtension = Extension.create<WatermarkStorage>({
  name: 'watermark',

  // 1. 默认配置选项（支持 .configure 动态覆盖）
  addOptions() {
    return {
      text: '内部保密 · SPEED SHEET',
      color: 'rgba(24, 144, 255, 0.12)',
      fontSize: 22,
    }
  },

  // 2. 插件独立状态存储
  addStorage() {
    return {
      visible: true,
      text: '',
    }
  },

  // 3. 注册插件独有命令：sheet.commands.toggleWatermark()
  addCommands({ sheet }) {
    return {
      toggleWatermark: () => () => {
        const ext = sheet.extensions.find((e) => e.name === 'watermark')
        if (ext) {
          ext.storage.visible = !ext.storage.visible
          sheet.notifyUpdate()
          return true
        }
        return false
      },
      setWatermarkText: (newText: string) => () => {
        const ext = sheet.extensions.find((e) => e.name === 'watermark')
        if (ext) {
          ext.storage.text = newText
          sheet.notifyUpdate()
          return true
        }
        return false
      },
    }
  },

  // 4. 挂载到表格视口上方的浮层组件 (Overlay)
  addOverlay() {
    return new VueSheetOverlayRenderer(WatermarkLayer)
  },
})
```

---

### 2. 在业务组件中注册与使用

```vue
<template>
  <SpeedSheet
    :ydoc="doc"
    :extensions="extensions"
    class="sheet-container"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as Y from 'yjs'
import { SpeedSheet } from '@speed-sheet/vue3-antd'
import '@speed-sheet/vue3-antd/dist/style.css'
import { WatermarkExtension } from './watermark'

const doc = new Y.Doc()

// 注入水印插件，并通过 .configure 覆盖配置
const extensions = [
  WatermarkExtension.configure({
    text: '公司机密 · 禁止外泄',
    color: 'rgba(255, 0, 0, 0.12)',
  }),
]
</script>
```

---

## 在线体验

在官方 Demo 中，我们完整演示了水印插件与表格各类交互能力的无缝融合：

👉 [点击进入 Speed Sheet 在线 Demo](https://whateveryoudo.github.io/speed-sheet/demo/)
