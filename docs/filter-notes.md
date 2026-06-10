# 筛选功能说明

> 包：`@speed-sheet/extension-filter` · UI：`@speed-sheet/vue3-antd` · 宿主：Speed Knowledge Client

## 概述

表格列筛选：支持按**内容**、**颜色**（背景 / 文字）、**条件**（文本 / 数值 / 日期 / 通用）三种方式；全局仅一份筛选会话；Canvas 绘制绿色表头标记与数据区实线描边；隐藏不符合条件的行。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│  FilterConfigPanel / FilterConditionPanel（vue3-antd 气泡）   │
├─────────────────────────────────────────────────────────────┤
│  @speed-sheet/extension-filter                               │
│  FilterExtension · evaluate · persist · sync-ydoc            │
├─────────────────────────────────────────────────────────────┤
│  @speed-sheet/core                                           │
│  Sheet.setFilterView() · FilterViewState · renderer/canvas   │
└─────────────────────────────────────────────────────────────┘
         持久化：Y.Doc（编辑态） / WorkbookSnapshot（查看态落库）
```

### 运行时 vs 持久化

| 层级 | 内容 |
|------|------|
| **Canvas 运行时** | `FilterExtensionStorage.session` + `hiddenRows` → `Sheet.setFilterView()` |
| **共享筛选** | Y.Doc 当前 sheet 根：`sheetFilter`（`visibleToAll: true`） |
| **私有筛选** | Y.Doc 当前 sheet 根：`sheetFilterPrivate` → `Record<userId, FilterSession>` |
| **快照落库** | `SheetSnapshot.sheetFilter` / `sheetFilterPrivate`（服务端 `toSnapshot()` 写入 `node_json`） |

### 生效优先级

1. 存在激活的 **共享** `sheetFilter` → 所有协作者/查看者看到同一份筛选  
2. 否则 → 应用当前登录用户 `sheetFilterPrivate[userId]`  
3. 关闭共享并清除共享键 → 各用户恢复自己的私有视图（不会误删他人私有桶）

## 筛选范围

| 选区方式 | 行为 |
|----------|------|
| **单格点选** | 从该格所在列向下截断至 sheet 末行；`headerRow = null`（无表头行） |
| **框选多格** | 保留选区；同步 `state.setSelection`；`headerRow` 为选区首行 |

范围解析：`resolveFilterScope` / `filterScopeToSelection`（`range.ts`）。

## 筛选方式

### 按内容

- 多选值列表；空单元格键为 `__empty__`
- 列值统计：`collectColumnValueStats`

### 按颜色

- 维度：背景 `bg` / 文字 `fc`
- 无填充键：`__color_none__`（排序时「无背景」优先）
- 单选（非多 checkbox）；手动 4 列网格布局

### 按条件

- 类型 Tab：`text` / `number` / `date` / `common`
- **通用（common）**：重复值 / 唯一值 / 空值 / 非空值
- 多条条件支持 `and` / `or` 连接
- 日期预设：昨天 / 今天 / 本周 / 上月等（`condition-meta.ts`）

> 面板内「排序」规则目前仅 UI 状态，**尚未应用到行顺序**。

## Canvas 表现

- **表头标记**：参与筛选列的 marker 行右上角绿色漏斗图标（`#52c41a`）
- **数据描边**：绿色 **实线** 2px 框住筛选数据区（与蓝色选区区分）
- **隐藏行**：`hiddenRows` 参与 `grid-metrics` 行高为 0，行号不连续

`FilterViewState` 字段：`hiddenRows`、`columns`、`markerRow`、`active`、`dataStartRow`、`dataEndRow`、`headerRow`。

## UI 交互（vue3-antd）

### 工具栏「筛选」

循环逻辑（`menus/toolbar/filter.vue`）：

- 已有筛选会话 **或** 配置面板已打开 → **仅清除**筛选并关面板  
- 否则 → `prepareFilterScope` + 打开 `FilterConfigPanel`

编辑已有筛选：点击表头绿色漏斗图标打开面板（非工具栏）。

### 配置面板

- Tab：内容 / 颜色 / 条件  
- 开关「筛选对所有人可见」：  
  - **关**：写入 `sheetFilterPrivate[currentUserId]`  
  - **开**：写入 `sheetFilter`（不清除其他用户私有条目）

### SpeedSheet 接入

```ts
// props
filterUserId?: string | null  // 当前登录用户 id，私有筛选分桶

// 内置扩展注入（sheetBuiltin.ts）
SheetFilter.extend({
  addOptions: () => ({
    getCurrentUserId: () => filterUserId ?? 'anonymous',
  }),
})
```

## 编辑态 vs 查看态（语雀对齐）

| 模式 | 数据来源 | 筛选 |
|------|----------|------|
| **编辑态** | Y.Doc + Hocuspocus 实时协同 | 读写 Y.Doc 键；`bindFilterYdocSync` 监听变更 |
| **查看态** | `node_json` 静态快照 | **不连协同**；从快照恢复 `sheetFilter` / `sheetFilterPrivate`；刷新页面拉最新落库 |

服务端协同落库（`collaboration.service.ts`）调用 `sheet.toSnapshot()`，快照已包含筛选字段。

## 初始化时序（extension-filter）

`Sheet` 构造函数中 `_initExtensions` 早于 `_initData`，`sheet.state` 在 `onInit` 时尚未就绪：

- `onInit` 内用 `queueMicrotask` 延后 `bindFilterYdocSync`  
- `onSheetSwitch` 调用 `rebindFilterYdocSync`，observer 挂到当前 sheet 的 root  
- `getSheetRoot` 空值保护，避免 `Cannot read properties of undefined (reading 'root')`

## Y.Doc 数据结构示例

```text
sheets.{sheetId}
  ├── sheetFilter          → FilterSession JSON（visibleToAll: true）
  └── sheetFilterPrivate   → { "123": FilterSession, "456": FilterSession, ... }
```

## 涉及文件

| 区域 | 路径 |
|------|------|
| 扩展 | `packages/extensions/extension-filter/src/` |
| Core 视图 | `packages/core/src/Sheet.ts`（`FilterViewState`）、`renderer/canvas/` |
| 快照 | `packages/shared/src/index.ts`（`SheetSnapshot`）、`SheetState.toSnapshot` / `Sheet._loadSnapshot` |
| UI | `packages/vue3-antd/src/bubbleMenus/filterConfigMenu/`、`menus/toolbar/filter.vue` |
| 宿主 | `speed-knowledge-client/.../SheetEditor.vue`（`filterUserId`、编辑/查看分流） |

## 已知限制

- 任意有编辑权限的用户可覆盖共享 `sheetFilter`（暂无权限模型）  
- 条件/颜色规则变更后，单元格编辑触发的 `onCellChange` 主要持久化内容规则路径（颜色/条件需确认面板确定后是否完整落库）  
- 旧文档快照无 `sheetFilter*` 字段时，查看态无筛选，需编辑保存一次后刷新  
- 点「保存」进查看态时，若协同落库有延迟，可能需再刷新一次才看到最新筛选

## 相关文档

- 开发日志：[`DEVLOG.md`](./DEVLOG.md) § 2026-06-01 筛选  
- 架构：[`ARCHITECTURE.md`](../ARCHITECTURE.md)
