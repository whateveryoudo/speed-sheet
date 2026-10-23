# Speed Sheet

> **现代版轻量在线电子表格引擎**：摒弃传统全量二维矩阵包袱，基于平铺稀疏结构 + Yjs CRDT + 自研 Canvas 视口调度。上层提供 Luckysheet 格式透明中转适配，搭配基于 Ant Design Vue 的开箱即用 UI 组件。

<p align="center">
  <a href="https://whateveryoudo.github.io/speed-sheet/demo/" target="_blank">
    <img src="https://img.shields.io/badge/Live_Demo-在线体验试玩-blue?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://whateveryoudo.github.io/speed-sheet/docs/" target="_blank">
    <img src="https://img.shields.io/badge/Docs-官方完整文档-purple?style=for-the-badge" alt="Docs" />
  </a>
</p>

---

## 🌟 核心设计理念

### 1. 摒弃全量二维数组，拥抱平铺现代架构
传统开源表格重度依赖庞大的二维密集矩阵（如 `data[r][c]`）以及历史遗留的全局单例状态，容易引起内存碎片与状态失控。  
**Speed Sheet 底层彻底采用平铺化结构**，天然契合分布式 CRDT 协同事务与高频操作；**同时在上层提供透明的数据中转层**，业务方无需重构已有数据模型，直接传入老格式即可平滑运行！

### 2. 统一组件入口：协同与非协同仅一参之差
无需按业务场景安装繁琐的多包组合，UI 侧统一使用单一入口组件 `<SpeedSheet />`：
- **单机 / 本地模式**：传入数据快照即可快速运行；
- **多人协同模式**：只需额外传入协同状态 `:ydoc="ydoc"`，内部自动走 `Y.transact` 进行 CRDT 状态合并与光标感知；
- **只读查看态**：设置 `:editable="false"` 即可作为纯静态表格秒开预览。

---

## 🚀 快速上手 (Quick Start)

### 安装

宿主工程只需安装组件包与基础依赖即可：

```bash
pnpm add @speed-sheet/vue3-antd vue ant-design-vue
```

> `@speed-sheet/core` 和 `@speed-sheet/shared` 已由组件包内置依赖，宿主无需单独安装。

---

### 场景一：直接接入 Luckysheet 数据（老项目平替）

直接传入已有的 Luckysheet 格式数据（二维数组或 `celldata`），支持双向变更监听：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SpeedSheet } from '@speed-sheet/vue3-antd'
import type { LuckysheetFile } from '@speed-sheet/shared'

// 现有的 Luckysheet 格式数据
const myLuckysheetData = ref<LuckysheetFile>({
  name: '年度业绩表',
  data: [
    ['部门', '负责人', 'Q1销售额', 'Q2销售额'],
    ['研发部', '张三', 120000, 150000],
    ['运营部', '李四', 80000, 95000],
  ],
})

const onSave = (data: LuckysheetFile) => {
  console.log('表格更新数据(Luckysheet格式):', data)
}
</script>

<template>
  <div style="height: 100vh;">
    <SpeedSheet
      :luckysheet-data="myLuckysheetData"
      :show-toolbar="true"
      :show-formula-bar="true"
      @luckysheet-change="onSave"
    />
  </div>
</template>
```

---

### 场景二：原生模式（协同 vs 本地单机仅一参之差）

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SpeedSheet } from '@speed-sheet/vue3-antd'
import type { WorkbookSnapshot } from '@speed-sheet/shared'

const isCollaborative = ref(false) // 是否开启协同
const sheetSnapshot = ref<WorkbookSnapshot>(/* 初始表格快照 */)

// 协同外部注入的 Y.Doc（连接 Hocuspocus / y-websocket）
const myYdoc = ref(/* 外部 Y.Doc 实例 */)
</script>

<template>
  <div style="height: 100vh;">
    <!-- 
      - 本地单机模式：仅传 :sheet-data
      - 多人协同模式：额外多传一个 :ydoc="myYdoc" 即可
      - 纯查看态：设置 :editable="false"
    -->
    <SpeedSheet
      :sheet-data="sheetSnapshot"
      :ydoc="isCollaborative ? myYdoc : undefined"
      :editable="true"
      @change="(snapshot) => console.log('最新快照:', snapshot)"
    />
  </div>
</template>
```

---

## 📖 SpeedSheet Props 全景参数速查

`<SpeedSheet />` 组件采用扁平清晰的属性设计，覆盖了从数据输入、协同控制到菜单定制的全部功能：

### 1. 数据与协同相关

| 属性 Prop | 类型 Type | 默认值 | 说明 Description |
| :--- | :--- | :---: | :--- |
| **`sheetData`** | `WorkbookSnapshot` | - | 原生 v2 快照数据（推荐，性能最佳） |
| **`luckysheetData`** | `LuckysheetFile` | - | Luckysheet 原始数据兼容导入（支持二维数据与 `celldata`） |
| **`onChange`** | `(snapshot: WorkbookSnapshot) => void` | - | 表格数据变更时触发，返回完整的 WorkbookSnapshot |
| **`onLuckysheetChange`**| `(data: LuckysheetFile) => void` | - | 变更时返回 Luckysheet 兼容格式数据（便于老项目直接回存） |
| **`ydoc`** | `Y.Doc` | - | **多人实时协同状态**。传入即自动走 Yjs CRDT 同步，所有写入走 `Y.transact` |
| **`filterUserId`** | `string \| null` | - | 协作筛选用户 ID，用于私有视图按用户分桶存储 |
| **`editable`** | `boolean` | `true` | 是否允许编辑。设为 `false` 则为**纯静态查看态**（屏蔽工具栏写入与编辑交互） |

---

### 2. 界面与工具栏定制

| 属性 Prop | 类型 Type | 默认值 | 说明 Description |
| :--- | :--- | :---: | :--- |
| **`showToolbar`** | `boolean` | `true` | 是否展示顶部工具栏 |
| **`showFormulaBar`** | `boolean` | `true` | 是否展示顶部公式编辑栏 |
| **`showSheetTabs`** | `boolean` | `true` | 是否展示底部工作表多页签栏 |
| **`lang`** | `'zh' \| 'en'` | `'zh'` | 界面语言，支持中英双语 |
| **`toolbarKeys`** | `ToolbarItemConfig[]` | - | 正向自定义工具栏按钮，支持 `'\|'` 分隔符（传入则仅展示指定项） |
| **`excludeToolbarKeys`**| `string[]` | - | 从默认工具栏中反向排除指定的按钮 key（例如 `['chart', 'freeze']`） |
| **`insertMenuKeys`** | `InsertMenuItemConfig[]`| - | 左上角“插入(+)”菜单项，内置复选框、下拉、图片、图链、附件等 |
| **`cellContextMenu`** | `ContextMenuItemConfig[]`| - | 单元格右键菜单项配置 |
| **`excludeContextMenuKeys`**| `string[]` | - | 单元格右键菜单反向排除项 |
| **`sheetTabContextMenu`** | `SheetTabMenuItemConfig[]`| - | 底部工作表页签右键菜单（支持重命名、复制、删除、隐藏等） |

---

### 3. 高级扩展与配置

| 属性 Prop | 类型 Type | 默认值 | 说明 Description |
| :--- | :--- | :---: | :--- |
| **`extensions`** | `(Extension \| ExtensionConfig)[]`| - | TipTap 风格可插拔扩展列表（如水印、自定义渲染器等） |
| **`upload`** | `SheetUploadConfig` | - | 图片 / 附件上传接口配置 |
| **`searchReplace`** | `{ enabled?: boolean, shortcut?: boolean }` | `{ enabled: true, shortcut: true }` | 查找与替换功能开关及快捷键配置 |
| **`defaultFontSize`**| `number` | `11` | 默认单元格字体大小 |
| **`rowHeaderWidth`** | `number` | `46` | 行号表头默认宽度 |
| **`columnHeaderHeight`**| `number` | `24` | 列标表头默认高度 |

---

## ⚡ 核心命令链操作 (Commands Chain)

Speed Sheet 提供了类似 TipTap 的强类型链式调用 API（Chain Commands），你可以通过获取组件实例直接编排复杂的批量操作：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SpeedSheet } from '@speed-sheet/vue3-antd'

const sheetRef = ref<InstanceType<typeof SpeedSheet> | null>(null)

// 外部调用命令链：批量修改单元格数据并一次性生效
function handleBatchUpdate() {
  const sheet = sheetRef.value?.sheet
  if (!sheet) return

  sheet.chain()
    .setCellValue({ r: 0, c: 0, value: '部门名称' })
    .setCellValue({ r: 0, c: 1, value: '年度预算' })
    .setCellValue({ r: 1, c: 0, value: '技术研发中心' })
    .setCellValue({ r: 1, c: 1, value: 5000000 })
    .run()
}
</script>
```

---

## 🔌 扩展插件开发 (TipTap 风格 Extension)

你可以非常轻松地为 Speed Sheet 编写自定义插件（比如给表格添加动态背景水印、定制快捷键等）：

```ts
import { Extension } from '@speed-sheet/core'

export const WatermarkExtension = Extension.create({
  name: 'watermark',
  addOptions() {
    return {
      text: '内部资料 · 严禁外传',
      color: 'rgba(0, 0, 0, 0.08)',
      fontSize: 20,
    }
  },
  // 可以注册命令、注册快捷键或扩展 Canvas 渲染钩子
})
```

挂载时只需在组件上配置 `:extensions="[WatermarkExtension.configure({ text: 'Confidential' })]"` 即可。

---

## 🧩 架构设计与分层

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
- ✔️ **条件格式**：工具栏 + 右侧侧栏；突出显示单元格 / 数据条；应用范围表格选区；Y.Doc 持久化
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
- [x] 条件格式
- [x] 数据验证 — **下拉列表**（多选 / 颜色等待完善）
- [ ] 虚拟滚动 + 按需加载单元格块
- [ ] 主题 API（`createTheme()` 注入颜色 / 字体）

#### 扩展插件

- [x] `@speed-sheet/extension-filter` — 列筛选（内容 / 颜色 / 条件；Y.Doc + 快照持久化）
- [x] `@speed-sheet/extension-conditional-format` — 条件格式（单元格高亮 / 数据条；Y.Doc 持久化）
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

- **[Speed Editor](https://github.com/whateveryoudo/speed-editor)** — 同生态开箱即用富文本编辑器
- **[Speed Knowledge Client](https://github.com/whateveryoudo/speed-knowledge-client)** — 语雀类现代协作知识库平台，已深度集成 Speed Sheet 作为表格编辑器（在线体验：[speeddoc.cn](http://speeddoc.cn/)）
- **[Speed Knowledge Server](https://github.com/whateveryoudo/speed-knowledge-server)** — 后端服务（NestJS 协同 + FastAPI 主 API）

## 文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 架构分层与设计原则
- [packages/view/README.md](./packages/view/README.md) — 视口层 `SheetViewport`
- [docs/DEVLOG.md](./docs/DEVLOG.md) — 开发日志
- [docs/filter-notes.md](./docs/filter-notes.md) — 列筛选功能说明
- [docs/conditional-format-notes.md](./docs/conditional-format-notes.md) — 条件格式功能说明
- [docs/layout-and-formula-notes.md](./docs/layout-and-formula-notes.md) — 布局 v2 与公式同步说明
