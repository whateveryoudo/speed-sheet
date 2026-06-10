# speed-sheet 架构说明

现代版 Luckysheet：Headless Core + Yjs 协同 + 框架适配层（Vue3 / React）。

## 目标分层

```
┌─────────────────────────────────────────────────────────┐
│  App / Demo (demos/vue3-demo, 你的业务应用)              │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/vue3-antd  ← 可选 UI（Ant Design Toolbar 等）        │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/vue3  │  @speed-sheet/react   ← 框架胶水（很薄）      │
│  SheetCanvas + useSheetCanvasView │ 直接绑 SheetViewport           │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/view  ← 视口编排：滚动、绘制调度、指针/键盘/拖拽      │
│  SheetViewport + controllers（无 Vue / React）                     │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/extension-*  ← 可选插件（筛选、导入导出…）       │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/core  ← 无 UI：Sheet、Extension、Command、渲染 API │
│  Y.Doc 数据 │ renderer/canvas renderSheet │ interaction Session   │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/shared  ← 纯类型与 cellKey 等工具                │
└─────────────────────────────────────────────────────────┘
         协同层：y-websocket / y-webrtc + 共享 Y.Doc
```

对标关系（便于迁移思维）：

| 概念 | speed-sheet | TipTap / ProseMirror |
|------|-------------|----------------------|
| 文档模型 | `@speed-sheet/core` `Sheet` | `Editor` / `EditorState` |
| 视口与输入 | `@speed-sheet/view` `SheetViewport` | `EditorView` |
| 框架绑定 | `@speed-sheet/vue3` `useSheetCanvasView` | `@tiptap/vue-3` |
| 产品 UI | `@speed-sheet/vue3-antd` `SpeedSheet` | 业务层 |

### @speed-sheet/core 目录结构

```
packages/core/src/
├── Sheet.ts
├── extension/              # TipTap 风格插件系统
│   ├── Extension.ts          # 基类 + ExtensionConfig
│   ├── types.ts              # CommandFn, CommandContext, …
│   ├── core/                 # 内置扩展（CORE_EXTENSIONS）
│   │   ├── keyboard.ts
│   │   ├── selection.ts
│   │   ├── history.ts
│   │   ├── clipboard.ts
│   │   └── cell-editing.ts
│   └── index.ts
├── commands/CommandManager.ts
├── state/SheetState.ts
├── renderer/
│   ├── grid-layout.ts、grid-metrics.ts、layout-metrics.ts …
│   └── canvas/               # renderSheet 绘制管线（已自 canvas-renderer 拆出）
├── interaction/              # 无 DOM Session（框选/resize/行移动…）
├── adapter/luckysheet-adapter.ts
└── formula/README.md         # 占位：公式走 @speed-sheet/extension-formula
```

### @speed-sheet/view 目录结构

```
packages/view/src/
├── sheet-viewport.ts         # SheetViewport 编排入口
├── layout/sheet-layout.ts
├── draw/canvas-draw.ts
├── scroll/scroll-bar.ts
├── input/                    # pointer、keyboard、selection/resize/move、context-menu
├── overlay/                  # cell-error-tip、editor-layout
└── data/canvas-data.ts
```

可选插件在 **`packages/extensions/*`**（如 filter、import-export），不要堆进 `extension/core/`。

### @speed-sheet/core 应包含

| 模块 | 职责 |
|------|------|
| `Sheet` | 工作簿生命周期，持有 `Y.Doc` |
| `extension/` | TipTap 风格插件：commands、快捷键、storage |
| `CommandManager` | `chain().setCellValue().run()` |
| `SheetState` | 单 sheet 的 Y.Map 读写 |
| `renderer/canvas/` | **主题无关**的 `renderSheet` 绘制 API |
| `interaction/*` | 拖拽/导航 **Session**（无 DOM） |
| `adapter/luckysheet-adapter` | 旧 Luckysheet JSON 互转 |

### @speed-sheet/view 应包含

| 模块 | 职责 |
|------|------|
| `SheetViewport` | 编排 layout、draw、scroll、pointer、keyboard、各类拖拽 |
| `*Controller` | 将 core `interaction` Session 绑到 DOM 事件 |
| `overlay/editor-layout` | 内联编辑器几何（不含 RichInput 组件） |

详见 [`packages/view/README.md`](./packages/view/README.md)。

### @speed-sheet/core 不应包含

- ant-design-vue / 工具栏 DOM
- `requestAnimationFrame` / `ResizeObserver` 等视口生命周期（在 **view**）
- 公式栏、右键菜单、Sheet 标签栏（除非做成可选 headless 组件）
- jQuery、Luckysheet 原 `controllers/handler.js` 巨型事件文件

### 框架包（vue3 / react）职责

**原则：视口逻辑在 `@speed-sheet/view`；vue3 只保留 Vue 响应式胶水，不要恢复十几个薄封装 composable。**

| 包 | 保留 |
|----|------|
| **vue3** | `SheetCanvas` 模板 + **`useSheetCanvasView`**（绑 `SheetViewport`）+ **`useSheetInlineEdit`**（`FormulaRichInput`）+ `useSheet` |
| **react** | 直接 `new SheetViewport(...)` + React state 订阅（`@speed-sheet/react` 待完善） |

`SheetCanvas` 仍负责：

- 滚动容器 + 钉在视口的 Canvas（见下文「Canvas 视口模式」）
- `#context-menu` slot（仅 payload，无 UI 库）
- **`SheetBubbleMenusHost`**：扩展气泡挂载
- **`resolveCellDblClick`**：产品层拦截双击

### @speed-sheet/vue3-antd 职责

- **`SpeedSheet`** = `SheetFormulaBar` + `SheetToolbarHost` + `SheetCanvas` + `SheetTabBar`
- 菜单：`menus/toolbar`、`menus/insert`、`menus/contextMenu`、`menus/sheetTabMenu`（antd）
- 扩展 UI：`extensions/image`、`extensions/dropdown`；气泡 `bubbleMenus/*`（经 `SheetBubbleMenusHost` 挂载，对标 tiptap `addBubbleMenu`）
- 样式：`.speed-sheet` + `style/base.less`；优先 `var(--ant-color-*)`（见 speed-components `useAntdCssVars`）
- 安装：`installSpeedSheetUi` 合并内置扩展、`ensureSpeedComponents`（iconfont 并集，不重复 `app.use`）
- 约定详见 [`.cursor/rules/vue3-layering.mdc`](.cursor/rules/vue3-layering.mdc)、[`docs/DEVLOG.md`](docs/DEVLOG.md)

### 协同（Yjs）

```ts
const ydoc = new Y.Doc()
const provider = new WebsocketProvider(wsUrl, roomId, ydoc)

const sheet = new Sheet({ ydoc, extensions: [...] })
// 所有写入走 Y.transact → 自动同步
```

建议 Y.Doc 结构（当前实现）：

- `sheets` → Map\<sheetId, Y.Map\>
  - `name`, `cells` (Map\<`R{r}_C{c}`, Y.Map attrs\>), `merges`, `rowHeight`, …

## 与旧 Luckysheet 的迁移路径

1. **数据**：`importFromLuckysheet(file)` → Y.Doc  
2. **渲染**：用 `renderSheet` 替代 `global/draw.js` 的单体绘制  
3. **交互**：按功能拆 Extension（筛选、冻结、条件格式…），不要一个 handler 6000 行  
4. **公式**：后续独立 `@speed-sheet/extension-formula` 或 WASM 引擎  

## 构建工具：Vite vs tsup

| 包类型 | 推荐 | 原因 |
|--------|------|------|
| 纯 TS 库（shared、extension-*） | **tsup** | 零配置、dts、更快，不需要 Vite 的 dev server |
| 含 Vue SFC 的 @speed-sheet/vue3 / vue3-antd | **vite** | 需要 `@vitejs/plugin-vue` |
| 含 React TSX 的 @speed-sheet/react | **tsup + esbuild jsx** 或 vite | 视是否打包 CSS |
| core（仅 TS，含 vitest） | tsup 或 vite lib mode 均可 | 当前为 vite |

扩展包之前「每个包一个 vite.config」是因为脚手架复制粘贴；**单文件 TS 扩展用共享 `tools/tsup.lib.ts` 即可**。

## Canvas 视口模式（重要）

正确结构：

```html
<div class="scroll" style="flex:1; min-height:0; overflow:auto; position:relative">
  <div class="spacer" style="width:totalW; height:totalH" />  <!-- 撑开滚动条 -->
  <canvas style="position:absolute; top:0; left:0" />           <!-- 钉在视口 -->
</div>
```

常见坑：

1. **flex 子项无 `min-height: 0`** → spacer 把整页撑高，看起来像 canvas 高度无限增长  
2. **`draw()` 在 clientHeight=0 时 `requestAnimationFrame` 死循环** → 应等 ResizeObserver  
3. **只绘制 `cells` 数组里有数据的格** → 空区域靠网格线；需按视口画 grid  

## 路线图（建议优先级）

- [x] Core + Yjs + Extension 骨架  
- [x] Canvas 视口渲染 + Vue3 `SheetCanvas`  
- [x] `@speed-sheet/view` 视口层 + `SheetViewport` 编排  
- [x] 冻结行列（core + toolbar）  
- [ ] React 绑 `SheetViewport`（`@speed-sheet/react`）  
- [ ] y-websocket 协同 demo  
- [ ] 主题 API：`createTheme()` 注入颜色/字体到 renderSheet  
- [ ] 虚拟滚动 + 按需加载单元格块  
- [ ] 公式 extension  
- [ ] 从 Luckysheet 迁移更多 extension（冻结、合并单元格绘制）  
