# 条件格式功能说明

> 包：`@speed-sheet/extension-conditional-format` · UI：`@speed-sheet/vue3-antd` · 绘制通道：`@speed-sheet/core` + `@speed-sheet/view`  
> 相关：[列筛选说明](./filter-notes.md)

## 概述

表格条件格式：支持 **突出显示单元格**（数值 / 文本条件 + 样式）与 **数据条**（渐变 / 纯色）两种规则类型；规则按应用范围批量求值；Canvas 绘制高亮背景与数据条；编辑态 Y.Doc 协同持久化。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│  ConditionalFormatSidebar / conditionalFormat 工具栏         │
│  useConditionalFormatPanel · useCfRangePick（vue3-antd）       │
├─────────────────────────────────────────────────────────────┤
│  @speed-sheet/extension-conditional-format                     │
│  ConditionalFormatExtension · evaluate · persist · sync-ydoc │
├─────────────────────────────────────────────────────────────┤
│  @speed-sheet/view                                           │
│  CanvasDrawController → buildCfRenderMaps → renderSheet       │
├─────────────────────────────────────────────────────────────┤
│  @speed-sheet/core                                           │
│  draw-cells（高亮样式）· draw-conditional-format（数据条）    │
└─────────────────────────────────────────────────────────────┘
         持久化：Y.Doc 当前 sheet 根 `sheetConditionalFormats`
```

### 分层职责

| 层级 | 内容 |
|------|------|
| **extension** | 规则 CRUD 命令、条件求值、Y.Doc 读写与 observer 同步 |
| **view** | 视口取 cell → `buildCfRenderMaps` → 传入 `RenderOptions` |
| **core** | 纯绘制：`conditionalFormatStyles` 合并进 `draw-cells`；`conditionalFormatDataBars` 独立绘制 |
| **vue3-antd** | 工具栏快捷预设、右侧规则列表 / 编辑器、应用范围表格选区 |

## 规则类型

### 突出显示单元格（`type: 'cell'`）

| 条件 | `conditionOp` | 说明 |
|------|---------------|------|
| 大于 | `greaterThan` | 数值比较 |
| 小于 | `lessThan` | 数值比较 |
| 介于 | `between` | `conditionValue` + `conditionValue2` |
| 等于 | `equal` | 数值或文本 |
| 文本包含 | `textContains` | 子串匹配 |

命中后应用 `style`：`bg` / `fc` / `bl` / `it` / `un`（与 `CellAttributes` 字段兼容）。

默认预设样式：浅红底 `#ffc7ce` + 深红字 `#9c0006`。

### 数据条（`type: 'dataBar'`）

- `dataBar.color`：条颜色
- `dataBar.gradient`：渐变（颜色 → 白）或纯色
- 最小 / 最大值：`minType` / `maxType` 支持 `min` | `max` | `num` | `percent`
- 条宽比例：在规则范围内收集数值，按 `(value - min) / (max - min)` 映射到单元格宽度

数据条绘制在单元格底部（高度约为格高的 35%，最大 12px）。

## 应用范围

- 规则字段：`row: [r0, r1]`、`column: [c0, c1]`（0-based，与引擎一致）
- A1 显示：`formatRangeA1` / `parseRangeA1`（如 `E3:H8`、`F7`）
- 求值时仅对范围内、视口内的 cell 计算（`cellInRange`）

### 表格区域选区（vue3-antd）

编辑规则时点击「应用范围」旁的表格图标：

1. 进入 `useCfRangePick` 选区模式
2. 顶部蓝色横幅：「请选择新的数据范围，按 ESC 取消」
3. 在 sheet 上拖选更新范围；蓝色虚线 overlay（复用 `formulaRefRanges` 绘制通道）
4. **Enter** 确认写回输入框，**ESC** 取消
5. 选区模式下忽略单元格单击气泡（`onCellClick` 短路）

## 命令 API

`ConditionalFormatExtension` 注册命令（`sheet.chain()`）：

| 命令 | 说明 |
|------|------|
| `addCfRule` | 新增规则（可省略 `id`，自动生成） |
| `updateCfRule` | 按 `id` 更新 |
| `removeCfRule` | 按 `id` 删除 |
| `clearCfRules` | 清空当前 sheet 全部规则 |

内置合并：`vue3-antd` 的 `mergeSpeedSheetExtensions` 在未传入同名扩展时自动挂载 `SheetConditionalFormat`。

## 持久化

| 键 | 位置 | 内容 |
|----|------|------|
| `sheetConditionalFormats` | 当前 sheet 的 `Y.Map` 根 | `CfRule[]` JSON 数组 |

- 写入：`writeCfRulesToYdoc`（`transactUser`）
- 读取 / 同步：`bindCfYdocSync` 监听根 Map；切 sheet 时 `onSheetSwitch` 清空并 rebind
- 初始化：`onInit` + `queueMicrotask` rebind（与 filter 扩展同模式）

> 当前 **未** 写入 `WorkbookSnapshot` 落库字段；查看态快照恢复待后续接入。

## Canvas 表现

1. **单元格高亮**：`draw-cells` 读取 `conditionalFormatStyles`，`bg`/`fc`/`bl`/`it` 优先于单元格自身样式（仅绘制层，不改 Y.Doc cell attrs）
2. **数据条**：`draw-conditional-format.ts` 在 `drawCells` 之后绘制；跳过 merge 从格与隐藏行
3. **选区 overlay**：范围选区模式额外合并一条 `formulaRefRanges`（`#1a73e8` 虚线）

## UI 交互（vue3-antd）

### 工具栏「条件格式」

| 菜单项 | 行为 |
|--------|------|
| 突出显示单元格 | 子菜单：大于 / 小于 / 介于 / 等于 / 文本包含 / 其他规则 |
| 数据条 | 渐变 / 纯色 6 色预设网格，一键按当前选区添加 |
| 新建规则 | 打开侧栏 |
| 管理已有规则 | 打开侧栏列表 |
| 清除规则 | `clearCfRules` |

快捷添加使用当前 `state.getSelection()` 作为应用范围。

### 右侧「条件格式」侧栏

- 标题区含 **Logo 占位**（`.cf-sidebar__logo-placeholder`，待替换正式资源）
- **列表模式**：按「所选区域 / 全部规则」过滤；单击选中、双击编辑；支持删除
- **编辑模式**：应用范围、规则类型、条件 / 数据条配置、样式预览与确认

i18n：`conditionalFormat.*`（`zh.json` / `en.json`）。

## 涉及文件

| 区域 | 路径 |
|------|------|
| 扩展 | `packages/extensions/extension-conditional-format/src/` |
| Core 绘制 | `packages/core/src/renderer/canvas/draw-cells.ts`、`draw-conditional-format.ts`、`types.ts` |
| View 胶水 | `packages/view/src/draw/canvas-draw.ts` |
| UI | `vue3-antd/src/components/ConditionalFormat*.vue`、`CfRangePickBanner.vue` |
| UI | `vue3-antd/src/menus/toolbar/conditionalFormat.vue` |
| Composables | `useConditionalFormatPanel.ts`、`useCfRangePick.ts`、`helpers/cfPresets.ts` |
| 内置扩展 | `vue3-antd/src/composables/sheetBuiltin.ts`、`extensions/conditional-format/` |
| 宿主挂载 | `vue3-antd/src/SpeedSheet.vue`（侧栏、`@select-range`、范围 overlay） |

## 后续可完善

- [ ] `WorkbookSnapshot` / Luckysheet 互转字段
- [ ] 更多条件类型（重复值、唯一值、日期为…）
- [ ] 规则优先级与多规则叠加策略
- [ ] 选区模式「确认(Enter)」浮动按钮（当前仅顶部横幅 + 键盘）
- [ ] 侧栏 Logo 正式资源替换

## 相关文档

- 开发日志：[`DEVLOG.md`](./DEVLOG.md) § 2026-06-10 条件格式
- 架构：[`ARCHITECTURE.md`](../ARCHITECTURE.md)
- 扩展包：[`packages/extensions/extension-conditional-format/README.md`](../packages/extensions/extension-conditional-format/README.md)
