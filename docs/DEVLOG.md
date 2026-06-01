# speed-sheet 开发日志

## 2026-06-01 — 插入菜单、下拉列表、图片气泡与 UI 集成

### 背景

对齐语雀 / Speed Tiptap Editor 的插入能力与扩展气泡模式；`@speed-sheet/vue3-antd` 补齐下拉数据验证、图片插入，并收敛扩展 overlay 与样式变量约定。

### 插入菜单（`menus/insert/`）

- Key 驱动注册：`insertMenuKeys` / `insertMenuConfig`（`SpeedSheet` props）
- 默认项：复选框、**下拉列表**、图片、链接、附件、备注、公式（见 `defaultInsertMenuKeys`）
- 工具栏 `InsertMenu.vue` 接入 `useInsertMenu` + `builtins.tsx`
- 富文本选区插入下拉前可弹确认（避免丢图片/附件）

### 下拉列表（Data Verification · dropdown）

**Core**

- `DataVerificationRule` 扩展：`options`、`multiSelect`、`useColor`、`value`
- 命令：`insertDropdown`、`setDropdownValue`、`removeDropdown`（`extension/core/cell-insert.ts`）
- Canvas：`drawCellDropdown` 在单元格内绘制取值文本 + 下拉箭头（无 DOM overlay 选值层）

**交互（vue3 + vue3-antd）**

| 操作 | 行为 |
|------|------|
| 单击已有下拉的格 | 展开/收起取值气泡（`togglePick`，约 250ms 延迟，避免与双击冲突） |
| 双击 | 打开配置气泡（`resolveCellDblClick`，不进入内联编辑） |
| 配置面板确认 | 选项 trim 后为空 → 不应用下拉模式 |
| 配置面板「移除」 | `removeDropdown`，恢复普通单元格 |
| Delete / Backspace | 选区内批量 `removeDropdown`（`SheetDropdown` 扩展快捷键） |

**配置面板**（`bubbleMenus/dropdownConfigMenu/DropdownListPanel.vue`）

- 默认 3 个空输入，打开聚焦第一项；支持多选/颜色开关、增删选项
- 通过 `provideDropdownConfigPanel` + 插入菜单 / 双击打开

**取值气泡**（`bubbleMenus/dropdownPickMenu/`）

- 32px 行高，选中项右侧 √（`--ant-*` 变量）
- 单选选后关闭；多选 toggle 数组值

**架构**

- `SheetDropdown` 扩展 → `addBubbleMenu()` → `dropdownMenus/index.vue`（config + pick）
- 与图片一致：由 `SheetBubbleMenusHost` 挂载，**不在** `SpeedSheet` Teleport
- `BubbleContainer` 统一浮层 padding / 背景 / 阴影；子菜单勿再覆盖外壳样式

**vue3 headless 补充**

- `SheetCanvas`：`resolveCellDblClick` prop，返回 `true` 时跳过默认内联编辑器
- `useSheetKeyboard`：焦点在 input/textarea 等表单控件时不拦截按键（配置面板可输入）

### 图片插入（摘要，同批落地）

- `@speed-sheet/extension-image` + `SheetImage` 扩展 + `imageMenu` 气泡
- App 级 `upload` / `useSpeedSheetProvider`；插入首张图可清单元格文本
- 行高列宽变更时 `layout` 同步，图片随格缩放

### 样式与 Cursor 规则

- 气泡 / 下拉 UI 优先 `var(--ant-*)`，业务色 `--speed-*` 见 `style/base.less`
- `.cursor/rules/vue3-layering.mdc` 增补 **bubbleMenus / 扩展 overlay** 变量与目录约定

### 宿主集成（`install.ts`）

- `app.use(SpeedComponents)` 改为 **`ensureSpeedComponents`**（已安装则只 `setConfig` 合并 `iconfontUrl`，避免 Vue 重复 plugin 警告）
- Sheet 的 `apis` / `upload` 仍走 `setSpeedSheetGlobalConfig`，与 SpeedComponents 全局 config 分层

### 涉及文件（摘要）

| 区域 | 路径 |
|------|------|
| Core 命令 / 渲染 | `packages/core/src/extension/core/cell-insert.ts`、`renderer/canvas-renderer.ts` |
| vue3 | `SheetCanvas.vue`、`useSheetCanvasPointer.ts`、`useSheetKeyboard.ts` |
| vue3-antd 扩展 | `extensions/dropdown/`、`extensions/image/` |
| 气泡 | `bubbleMenus/dropdownConfigMenu/`、`dropdownPickMenu/`、`BubbleContainer.vue` |
| 菜单 | `menus/insert/` |
| 外壳 | `SpeedSheet.vue`、`install.ts` |

### 相关文档

- 架构：[`ARCHITECTURE.md`](../ARCHITECTURE.md) § vue3-antd
- Cursor：[`/.cursor/rules/vue3-layering.mdc`](../.cursor/rules/vue3-layering.mdc)

---

## 2026-05-27 — Undo/Redo 调研 + Luckysheet 对照规则

### 结论

- Luckysheet：`jfundo`/`jfredo` 快照栈 + `controlHistory.js` 按 `type` 恢复 `flowdata`（见 `docs/undo-redo-research.md`）。
- speed-sheet：**优先 Yjs `UndoManager`**，不复制 Luckysheet 二维快照；`history.ts` 仍为 TODO。
- 新增 Cursor 规则：`.cursor/rules/reference-luckysheet.mdc`（新功能前先读 Luckysheet 无 UI 逻辑）。
- 原则补充：**交互对齐商业表 / Luckysheet；机制按 v2（Yjs + rowId）自选最优**，不复制 `flowdata` 快照栈（见 `docs/undo-redo-research.md` §0）。

### 落地（Phase A）

- `HistoryExtension` + `Y.UndoManager`（`trackedOrigins: YOriginUser`，`captureTimeout: 500`）
- `transactUser` / `transactSystem`；公式重算 `setCell(..., false)` + `transactSystem`
- `Sheet.canUndo/canRedo`；工具栏禁用；`SheetCanvas` Ctrl+Z / Ctrl+Y

---

## 2026-05-27 — API：`sheet-data` / `onChange` 改为 v2 快照

### 变更

- `SpeedSheet`：`sheet-data` + `onChange` 使用 **`WorkbookSnapshot`**（原生 v2）
- Luckysheet 兼容：`luckysheet-data` + `onLuckysheetChange`（可选）
- `Sheet` 初始化：**snapshot 优先于** `data`（Luckysheet）
- 工具：`luckysheetFileToSnapshot()` 用于从旧格式生成初始快照
- Demo：`App.vue` 按 snapshot 存回，不再把 Luckysheet `data` 矩阵当主流

---

## 2026-05-27 — 布局 v2 公式同步（插行跟格）

### 背景

表格已改为 **rowId/colId + rowOrder/colOrder**；公式在 `f` 里存内部 `#r_…:c_…#`，界面显示 A1。插行后应像语雀/Excel：**同一格数据下移、公式显示从 A3 变 A4**，不能拿插行后的旧字符串 `=A1+A3` 覆盖存储。

### 结论（维护者备忘）

1. **底层**：cells 的 key 不随插行变，只变 `rowOrder` → 详见 [`docs/layout-and-formula-notes.md`](./layout-and-formula-notes.md) §1。
2. **公式**：绑定 / 重算 / 插行前后提交 → 自研；`SUM`/`IF` 等 → `@formulajs/formulajs`。
3. **插行时序**：`onBeforeLayoutChange` 先提交编辑，再 `insertRows`，再 `recalculateWorkbook`，最后 `onLayoutChange` 关公式 UI。
4. **构造 Sheet**：已有 `ydoc.sheets` 时不再写入空 sheet0。

### 涉及文件（摘要）

| 区域 | 文件 |
|------|------|
| Core | `Sheet.ts`（before/after layout）、`SheetState` / `sheet-layout.ts` |
| 公式 | `formula-bindings.ts`、`engine.ts`、`extension.ts` |
| UI | `SpeedSheet.vue`、`SheetCanvas.vue` |

### 相关文档

- 可读说明（推荐先看）：[`layout-and-formula-notes.md`](./layout-and-formula-notes.md)

---

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
