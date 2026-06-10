# Speed Sheet

> **备注**：此项目大部分代码由 **Vibe Coding**（AI 辅助编程）完成，仍在快速迭代中。

Headless 在线表格引擎：Luckysheet 兼容数据模型 + Yjs 协同 + TipTap 风格扩展体系。提供 Vue3 / React 无头适配层，以及基于 Ant Design Vue 的开箱即用 UI 包。

## 特性

- 🧩 **Headless Core** — 表格逻辑、命令、Canvas 渲染与 UI 完全解耦
- 🔗 **Yjs 原生协同** — 所有写入走 `Y.transact`，天然支持多人实时编辑
- 🧱 **TipTap 风格 Extension** — 命令链、快捷键、插件化扩展
- 📦 **Luckysheet 互操作** — 支持旧格式导入与 `WorkbookSnapshot` v2 快照
- 🎨 **Ant Design Vue 皮肤** — `SpeedSheet` 开箱即用（工具栏 / 公式栏 / 页签栏）
- 🔍 **完整 TypeScript** — 类型贯穿 shared → core → 框架层

## 架构

现代版 Luckysheet：**Headless Core + Yjs 协同 + 框架适配层**。

```
┌─────────────────────────────────────────────────────────┐
│  App / Demo (demos/vue3-demo, 业务应用)                  │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/vue3-antd  ← 可选 UI（工具栏 / 公式栏等）   │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/vue3  │  @speed-sheet/react  ← 框架胶水     │
│  SheetCanvas + useSheetCanvasView │ SheetViewport 绑定    │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/view  ← 视口：滚动、绘制、指针/键盘/拖拽    │
│  SheetViewport（无 Vue / React）                         │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/extension-*  ← 可选插件（公式 / 筛选…）     │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/core  ← Sheet、Extension、Command、渲染 API │
│  Y.Doc │ renderer/canvas │ interaction Session            │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/shared  ← 类型定义、cellKey 等工具          │
└─────────────────────────────────────────────────────────┘
         协同层：Hocuspocus / y-websocket + 共享 Y.Doc
```

### 包说明

| Package | 职责 |
|---------|------|
| `@speed-sheet/shared` | 类型定义、cellKey 等纯工具 |
| `@speed-sheet/core` | Sheet 引擎、命令、`renderSheet`、interaction Session — 无 DOM |
| `@speed-sheet/view` | `SheetViewport`：滚动、绘制调度、输入与拖拽编排 |
| `@speed-sheet/vue3` / `@speed-sheet/react` | 框架胶水（vue3：`useSheetCanvasView` + `SheetCanvas`） |
| `@speed-sheet/vue3-antd` | Ant Design Vue 工具栏 / 公式栏 / 页签栏 |
| `@speed-sheet/extension-*` | 可选插件（公式、筛选、导入导出…） |

详细设计见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 功能清单

### ✅ 已完成功能

#### 核心引擎（`@speed-sheet/core`）

- ✔️ `Sheet` 工作簿生命周期管理（多 Sheet 页签）
- ✔️ TipTap 风格 Extension 插件系统 + `chain()` 命令链
- ✔️ Yjs `Y.Doc` 数据层（`cells` / `merges` / `rowHeight` / `colWidth` …）
- ✔️ Canvas 视口渲染（滚动容器 + 固定视口 Canvas）
- ✔️ `WorkbookSnapshot` v2 快照读写
- ✔️ Luckysheet 文件互转（`luckysheetFileToSnapshot`）
- ✔️ 默认文档内容生成（`createDefaultDocumentContent`）
- ✔️ 内置扩展：键盘、选区、历史、剪贴板、单元格编辑、行列操作、合并单元格
- ✔️ 单元格插入命令：复选框、**下拉列表**（`insertDropdown` / `setDropdownValue` / `removeDropdown`）
- ✔️ **列筛选视图**：`FilterViewState` + Canvas 隐藏行 / 绿色标记与描边
- ✔️ 快照读写 **`sheetFilter` / `sheetFilterPrivate`**（查看态落库）
- ✔️ Yjs `UndoManager` 撤销 / 重做
- ✔️ rowId / colId + rowOrder / colOrder 布局 v2（插删行列不重建 cell key）

#### 视口层（`@speed-sheet/view`）

- ✔️ `SheetViewport` 统一编排 layout / draw / scroll / pointer / keyboard
- ✔️ 框选、行列 resize、行列移动、自定义滚动条、右键命中、公式错误角标
- ✔️ 内联编辑器定位 helper（`computeEditorBox` 等，组件仍在 vue3）

#### 交互与编辑（`@speed-sheet/vue3`）

- ✔️ `useSheetCanvasView` — 唯一 viewport Vue 胶水（不再维护十几个薄 composable）
- ✔️ 单元格选区（单击 / 拖拽 / 键盘方向键）
- ✔️ 单元格内联编辑（双击 / F2 / 直接输入）
- ✔️ 行列拖拽调整宽高
- ✔️ 行列拖拽移动
- ✔️ 右键上下文菜单（复制 / 剪切 / 粘贴 / 插删行列 / 合并拆分 / 清除）
- ✔️ 公式栏富文本输入（支持单元格引用点选）
- ✔️ 公式错误提示
- ✔️ 扩展气泡宿主 `SheetBubbleMenusHost`；`resolveCellDblClick` 供产品层拦截双击

#### 公式引擎（`@speed-sheet/extension-formula`）

- ✔️ 基于 `@formulajs/formulajs` 的公式求值
- ✔️ 内部引用格式（`#r_…:c_…#`）与 A1 显示互转
- ✔️ 插删行列后公式引用自动跟随
- ✔️ 函数浏览器（分类浏览 + 参数说明 Popover）
- ✔️ 常用函数：SUM / IF / VLOOKUP 等（formulajs 目录）

#### UI 组件（`@speed-sheet/vue3-antd`）

- ✔️ `SpeedSheet` 一站式组件（工具栏 + 公式栏 + Canvas + 页签栏）
- ✔️ 工具栏：撤销 / 重做 / 格式刷 / 清除格式 / 字号 / 加粗 / 斜体 / 下划线
- ✔️ 工具栏：字体颜色 / 背景色 / 对齐 / 链接 / 查找替换 / 公式菜单
- ✔️ **插入菜单**（语雀式）：复选框、**下拉列表**、图片、链接、附件、备注、公式（`insertMenuKeys` 可配）
- ✔️ **下拉列表**：Canvas 渲染 + 单击取值气泡 / 双击配置面板；数据验证 `insertDropdown` / `removeDropdown`
- ✔️ **图片插入**：扩展层 + 选区气泡菜单；App 级 `upload` 配置
- ✔️ **列筛选**：工具栏 + 表头漏斗；内容 / 颜色 / 条件；配置面板；私有与共享视图
- ✔️ Sheet 页签栏（新增 / 切换 / 拖拽排序）
- ✔️ 页签右键菜单（重命名 / 复制 / 删除 / 隐藏 / 标签颜色）
- ✔️ 语雀式工作表列表 Popover
- ✔️ 中英文 i18n（`lang="zh" | "en"`）
- ✔️ 支持 `ydoc` 协同模式与 `sheet-data` 只读快照模式（快照含筛选状态）
- ✔️ `filterUserId` prop：私有筛选按用户分桶
- ✔️ `installSpeedSheetUi`：`ensureSpeedComponents` 与 SpeedComponents 共存无重复 plugin 警告

#### 协同

- ✔️ Yjs 文档结构天然支持 CRDT 协同
- ✔️ 已在 [Speed Knowledge Client](https://github.com/whateveryoudo/speed-knowledge-client) 中接入 Hocuspocus 实时协同

### 📋 待开发 / 进行中

#### 核心能力

- [ ] React 绑 `SheetViewport`（`@speed-sheet/react`）
- [x] 冻结行列（冻结窗格）
- [ ] 条件格式
- [x] 数据验证 — **下拉列表**（多选 / 颜色等待完善）
- [ ] 虚拟滚动 + 按需加载单元格块
- [ ] 主题 API（`createTheme()` 注入颜色 / 字体）

#### 扩展插件

- [x] `@speed-sheet/extension-filter` — 列筛选（内容 / 颜色 / 条件；Y.Doc + 快照持久化）
- [ ] `@speed-sheet/extension-import-export` — xlsx 导入导出

#### UI 与交互

- [x] 工具栏「插入」菜单 — 复选框 / 下拉 / 图片等（链接 / 附件等待完善）
- [ ] 页签「标签颜色」选择器
- [ ] 暗色主题
- [ ] 远程协同选区光标 UI 展示

#### 协同

- [ ] 独立 y-websocket 协同 Demo
- [ ] 协同场景下插删行列性能优化（Y.Array 方案调研中）

#### 生态建设

- [ ] **[类似语雀平台（持续更新中…）](https://github.com/whateveryoudo/speed-knowledge-client/tree/main)** — Speed Sheet 已作为表格文档编辑器接入

## npm 发版（Changesets）

各 `@speed-sheet/*` 子包**独立版本**，只有写了 changeset 的包才会发布（例如只改 `core` 时 `react` 不会动）。

```bash
pnpm changeset          # 选择要发的包 + bump 类型
# 提交 .changeset/*.md，合并 PR 后 CI 会开 Version Packages PR
```

合并 Version PR 后自动 publish 到 npm。详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 开发

```bash
pnpm install
pnpm build
pnpm demo   # http://localhost:4000
```

远程仓库：`git@github.com:whateveryoudo/speed-sheet.git`

## 相关项目

- **[Speed Knowledge Client](https://github.com/whateveryoudo/speed-knowledge-client)** — 知识库管理平台，已集成 Speed Sheet 作为表格文档编辑器
- **[Speed Tiptap Editor](https://github.com/whateveryoudo/speed-tiptap-editor)** — 同生态富文本编辑器
- **[Speed Knowledge Server](https://github.com/whateveryoudo/speed-knowledge-server)** — 后端服务（NestJS 协同 + FastAPI 主 API）

## 文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 架构分层与设计原则
- [packages/view/README.md](./packages/view/README.md) — 视口层 `SheetViewport`
- [docs/DEVLOG.md](./docs/DEVLOG.md) — 开发日志
- [docs/filter-notes.md](./docs/filter-notes.md) — 列筛选功能说明
- [docs/layout-and-formula-notes.md](./docs/layout-and-formula-notes.md) — 布局 v2 与公式同步说明
