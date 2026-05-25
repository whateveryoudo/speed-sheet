# speed-sheet 架构说明

现代版 Luckysheet：Headless Core + Yjs 协同 + 框架适配层（Vue3 / React）。

## 目标分层

```
┌─────────────────────────────────────────────────────────┐
│  App / Demo (demos/vue3-demo, 你的业务应用)              │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/vue3-antd  ← 可选 UI（Ant Design Toolbar 等）        │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/vue3  │  @speed-sheet/react   ← Headless 适配层     │
│  SheetCanvas, useSheet（无 UI 库；SheetRenderer 为别名）            │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/extension-*  ← 可选插件（筛选、导入导出…）       │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/core  ← 无 UI：Sheet、Extension、Command、渲染 API │
│  Y.Doc 数据 │ canvas renderSheet │ Luckysheet 适配器      │
├─────────────────────────────────────────────────────────┤
│  @speed-sheet/shared  ← 纯类型与 cellKey 等工具                │
└─────────────────────────────────────────────────────────┘
         协同层：y-websocket / y-webrtc + 共享 Y.Doc
```

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
├── renderer/canvas-renderer.ts
├── adapter/luckysheet-adapter.ts
└── formula/README.md         # 占位：公式走 @speed-sheet/extension-formula
```

可选插件在 **`packages/extensions/*`**（如 filter、import-export），不要堆进 `extension/core/`。

### @speed-sheet/core 应包含

| 模块 | 职责 |
|------|------|
| `Sheet` | 工作簿生命周期，持有 `Y.Doc` |
| `extension/` | TipTap 风格插件：commands、快捷键、storage |
| `CommandManager` | `chain().setCellValue().run()` |
| `SheetState` | 单 sheet 的 Y.Map 读写 |
| `renderer/canvas-renderer` | **主题无关**的 Canvas 绘制 API |
| `adapter/luckysheet-adapter` | 旧 Luckysheet JSON 互转 |

### @speed-sheet/core 不应包含

- ant-design-vue / 工具栏 DOM
- 公式栏、右键菜单、Sheet 标签栏（除非做成可选 headless 组件）
- jQuery、Luckysheet 原 `controllers/handler.js` 巨型事件文件

### 框架包（vue3 / react）职责

- **`SheetCanvas`**：滚动容器 + 固定视口 Canvas（`position: absolute` 相对 scrollport）
- 把 `scrollX/Y`、`viewportW/H` 传给 `renderSheet`
- 绑定鼠标/键盘到 `sheet.chain()`，选区在 canvas 内同步到 `sheet`
- **`#context-menu` slot**（仅 payload，无 UI 库）

### @speed-sheet/vue3-antd 职责

- **`SpeedSheet`** = `SheetFormulaBar` + `SheetToolbarHost` + `SheetCanvas` + `SheetTabBar`
- 菜单：`menus/toolbar`、`menus/contextMenu`、`menus/sheetTabMenu`（antd）
- 样式：`.speed-sheet` + `style/base.less`；优先 `var(--ant-color-*)`（见 speed-components `useAntdCssVars`）
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
- [x] Canvas 视口渲染 + Vue3 SheetRenderer  
- [ ] React SheetRenderer（@speed-sheet/react）  
- [ ] y-websocket 协同 demo  
- [ ] 主题 API：`createTheme()` 注入颜色/字体到 renderSheet  
- [ ] 虚拟滚动 + 按需加载单元格块  
- [ ] 公式 extension  
- [ ] 从 Luckysheet 迁移更多 extension（冻结、合并单元格绘制）  
