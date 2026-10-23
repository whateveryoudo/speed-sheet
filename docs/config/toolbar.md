# 工具栏定制 (Toolbar)

Speed Sheet 支持通过 `toolbarKeys`（正向指定）或 `excludeToolbarKeys`（反向排除）轻松定制顶部工具栏。

---

## 1. 正向定制按钮项

传入 `toolbarKeys` 数组，指定需要展示的按钮 key，使用 `'|'` 作为视觉分隔符：

```vue
<script setup lang="ts">
import { SpeedSheet } from '@speed-sheet/vue3-antd'

const customToolbarKeys = [
  'undo', 'redo', '|',
  'bold', 'italic', 'textColor', 'backgroundColor', '|',
  'fontSize', 'border', 'align', '|',
  'chart',
]
</script>

<template>
  <SpeedSheet :toolbar-keys="customToolbarKeys" />
</template>
```

---

## 2. 反向排除按钮项

如果大部分内置按钮都保留，只想剔除其中几个特定功能（例如屏蔽图表和冻结），使用 `excludeToolbarKeys` 最为便捷：

```vue
<script setup lang="ts">
import { SpeedSheet } from '@speed-sheet/vue3-antd'

// 从默认工具栏中排除 chart、freeze 和 protect 按钮
const excludeKeys = ['chart', 'freeze', 'protect']
</script>

<template>
  <SpeedSheet :exclude-toolbar-keys="excludeKeys" />
</template>
```

---

## 内置常用工具栏 Key 一览

| Key | 功能 |
| :--- | :--- |
| `undo` / `redo` | 撤销 / 重做 |
| `format-painter` | 格式刷 |
| `clear-format` | 清除格式 |
| `bold` / `italic` / `underline` / `strike` | 加粗 / 斜体 / 下划线 / 删除线 |
| `fontSize` / `fontFamily` | 字号 / 字体 |
| `textColor` / `backgroundColor` | 文字颜色 / 单元格填充色 |
| `border` | 单元格边框线条与颜色 |
| `align` / `valign` | 水平对齐 / 垂直对齐 |
| `merge` | 合并 / 拆分单元格 |
| `text-wrap` | 文本自动换行 |
| `freeze` | 冻结首行 / 首列 / 冻结窗格 |
| `filter` | 开启 / 关闭列筛选 |
| `chart` | 插入浮动图表 |
