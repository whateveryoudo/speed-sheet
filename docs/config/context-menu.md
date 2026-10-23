# 右键菜单定制 (Context Menu)

Speed Sheet 提供了覆盖 **单元格 (Cell)**、**选区 (Range)**、**整行/整列 (Row/Column)** 以及 **工作表页签 (Sheet Tab)** 的全功能上下文右键菜单。

---

## 1. 单元格右键菜单

### 反向排除内置项
通过 `excludeContextMenuKeys` 排除不需要的操作：

```vue
<script setup lang="ts">
import { SpeedSheet } from '@speed-sheet/vue3-antd'

// 排除删除行、删除列
const excludeKeys = ['deleteRow', 'deleteColumn']
</script>

<template>
  <SpeedSheet :exclude-context-menu-keys="excludeKeys" />
</template>
```

---

## 2. 工作表页签右键菜单

底部 Sheet 页签支持右键重命名、复制工作表、删除工作表、隐藏及设置标签颜色。

通过 `excludeSheetTabMenuKeys` 可禁用特定操作：

```vue
<template>
  <!-- 禁用删除工作表操作 -->
  <SpeedSheet :exclude-sheet-tab-menu-keys="['deleteSheet']" />
</template>
```
