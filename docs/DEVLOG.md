# speed-sheet 开发日志

## 2026-05-25 — Vue 分层与 headless 收敛

### 背景

`SheetRenderer` 同时承担 canvas + 公式栏 + 页签 + 工具栏容器，对外还有 `sheetView` / `selection` 等多份状态，和 Tiptap「一个 `editor` 句柄」不一致，产品层（SpeedSheet）胶水过多。

### 结论（框架层）

1. **严格 headless**：`@speed-sheet/vue3` 只保留 **`SheetCanvas` + `useSheet`**。
2. **产品皮**：`@speed-sheet/vue3-antd` 拼装公式栏、工具栏、页签、antd 菜单。
3. **数据与命令**：全部在 **`Sheet`（core）**；选区用 `sheet.state.getSelection()`，不单独维护平行 `selection` ref。
4. **响应式**：`revision` 驱动 canvas / 外壳重算；`computed` 读 `sheet.state` 时必须 `void revision`。
5. **对外 ref**：`SpeedSheet` 只 `defineExpose({ sheet, switchSheet, addSheet, viewportEl, revision })`。
6. **后续 Element 包**：只依赖 `vue3`，不依赖 `vue3-antd`。

### 已完成（摘要）

| 项 | 说明 |
|----|------|
| `SheetCanvas` | 从 `SheetRenderer` 拆出，仅视口 |
| `SheetViewState` 对外移除 | 改为内部实现细节（已废弃类型文件） |
| 选区 | Renderer 内 `applySelectRange`，父组件不必再写 `onSelectRange` |
| 页签 | `SheetTabBar` + `addSheet` / `reorderSheets`（`vuedraggable`） |
| 菜单 | `contextMenu`、`sheetTabMenu` 在 antd 包 |
| Luckysheet 风格 API | `getRange`、`setCellValue` 等在 `Sheet` 上 |
| antd 外壳 | `SheetFormulaBar` / `SheetTabBar` 使用 `a-*` 组件；样式变量 `style/base.less` |

### 待办 / 可选

- [ ] `vue3-element` 平行包
- [ ] 页签重命名改 `Modal` + `Input`（替换 `prompt`）
- [ ] `menus` 逻辑抽共享包（非必须）

### 相关文档

- 架构总览：[`ARCHITECTURE.md`](../ARCHITECTURE.md)
- Cursor 规则：[`/.cursor/rules/vue3-layering.mdc`](../.cursor/rules/vue3-layering.mdc)
