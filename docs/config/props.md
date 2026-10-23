# 组件 Props 全景配置

`<SpeedSheet />` 是 Speed Sheet 的顶层入口组件。组件采用扁平化 Props 设计，并在命名与功能设计上参考了主流电子表格（如 Luckysheet、Excel）的通用使用习惯。

---

## 1. 数据与状态配置

| Prop 属性名 | 类型 Type | 默认值 | Luckysheet 对应配置 | 详细说明 |
| :--- | :--- | :---: | :--- | :--- |
| **`sheetData`** | `WorkbookSnapshot` | - | - | **Speed Sheet 原生快照数据（推荐）**。直接加载自研 Yjs 状态模型，性能最优。 |
| **`luckysheetData`** | `LuckysheetFile` | - | `data` | **Luckysheet 兼容中转数据**。支持传入 Luckysheet 格式的数据对象数组（支持 `celldata` 与二维数据），底层自动中转转换。 |
| **`ydoc`** | `Y.Doc` | - | - | **多人协同 Yjs 实例**。<br>• 传入：开启多人实时协同模式，所有操作走 CRDT 事务；<br>• 不传：为轻量单人模式。 |
| **`editable`** | `boolean` | `true` | `allowEdit` | **是否允许编辑**。<br>• `true`：完整编辑态；<br>• `false`：**只读查看态**（同一套 Canvas 视口渲染，自动隐藏工具栏与公式栏，禁用单元格就地输入与拖拽选区操作）。 |
| **`onChange`** | `(snapshot: WorkbookSnapshot) => void` | - | - | 表格数据变更时的回调，返回最新的原生 `WorkbookSnapshot` 快照。 |
| **`onLuckysheetChange`** | `(data: LuckysheetFile) => void` | - | - | 表格变更时回调 Luckysheet 兼容格式对象，方便已有业务服务直接持久化存库。 |
| **`filterUserId`** | `string \| null` | - | - | 协作筛选用户标识。用于为当前登录用户记录独立的私有筛选视图（不干扰其他协同成员）。 |

---

## 2. 界面视图与布局配置

| Prop 属性名 | 类型 Type | 默认值 | Luckysheet 对应配置 | 详细说明 |
| :--- | :--- | :---: | :--- | :--- |
| **`showToolbar`** | `boolean` | `true` | `showtoolbar` | 是否展示顶部工具栏（在 `editable: false` 时会自动隐藏）。 |
| **`showFormulaBar`** | `boolean` | `true` | `showstatisticBar` / `formulaBar` | 是否展示公式编辑栏（可查看/编辑当前激活单元格的公式与坐标）。 |
| **`showSheetTabs`** | `boolean` | `true` | `showsheetbar` | 是否展示底部工作表多页签栏（包含工作表切换、新增、排序、重命名等）。 |
| **`lang`** | `'zh' \| 'en'` | `'zh'` | `lang` | 界面国际化语言设置，目前支持简体中文与英文。 |
| **`rowHeaderWidth`** | `number` | `46` | `rowHeaderWidth` | 左侧行号表头的固定渲染宽度（像素 px）。 |
| **`columnHeaderHeight`** | `number` | `24` | `columnHeaderHeight` | 顶部列标表头 (A, B, C...) 的固定渲染高度（像素 px）。 |
| **`defaultFontSize`** | `number` | `11` | `defaultFontSize` | 单元格默认字体字号大小（pt）。 |
| **`devicePixelRatio`** | `number` | `window.devicePixelRatio` | `devicePixelRatio` | Canvas 渲染像素比，默认自适应高分屏/视网膜屏幕清晰度。 |

---

## 3. 工具栏与菜单定制

Speed Sheet 借鉴了现代扩展思路，支持**正向指定（白名单）**与**反向排除（黑名单）**两种定制方式：

| Prop 属性名 | 类型 Type | 默认值 | 详细说明 |
| :--- | :--- | :---: | :--- |
| **`toolbarKeys`** | `ToolbarItemConfig[]` | 全部内置项 | 自定义顶部工具栏展示项，以 `'\|'` 作为视觉分割线。<br>例如：`['undo', 'redo', '\|', 'bold', 'italic', 'colorPicker']`。 |
| **`excludeToolbarKeys`** | `string[]` | `[]` | 从默认工具栏中剔除指定的项（例如不需要图表时传入 `['chart']`）。当与 `toolbarKeys` 共同使用时以 `toolbarKeys` 优先。 |
| **`insertMenuKeys`** | `InsertMenuItemConfig[]` | 全部内置项 | 左上角“插入(+)”菜单项，内置复选框、下拉列表、图片、附件、图链与公式等。 |
| **`cellContextMenu`** | `ContextMenuItemConfig[]` | 全部内置项 | 单元格区域右键弹出的菜单项（包含复制、剪切、粘贴、插入/删除行列、清除等）。 |
| **`excludeContextMenuKeys`** | `string[]` | `[]` | 单元格右键菜单反向排除项。 |
| **`sheetTabContextMenu`** | `SheetTabMenuItemConfig[]`| 全部内置项 | 底部工作表页签右键菜单项（包含重命名、删除、复制副本、隐藏、设置颜色等）。 |
| **`excludeSheetTabMenuKeys`** | `string[]` | `[]` | 底部工作表右键菜单反向排除项。 |

---

## 4. 插件与功能开关

| Prop 属性名 | 类型 Type | 默认值 | 详细说明 |
| :--- | :--- | :---: | :--- |
| **`extensions`** | `(Extension \| ExtensionConfig)[]` | `[]` | 注入自定义插件（如水印插件、自定义浮层渲染器、自定义命令等）。 |
| **`searchReplace`** | `{ enabled?: boolean, shortcut?: boolean }` | `{ enabled: true, shortcut: true }` | 全局查找与替换功能开关。支持配置快捷键（`Ctrl/Cmd + F`、`Ctrl/Cmd + H`）响应。 |
| **`upload`** | `SheetUploadConfig` | - | 覆盖单元格插入图片、附件时的上传处理函数（也可在全局 `app.use(SpeedSheetUi)` 中配置）。 |
