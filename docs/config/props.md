# 组件 Props 全景配置

`<SpeedSheet />` 是 Speed Sheet 的一站式 UI 组件，内部已完整封装了工具栏、公式栏、Canvas 视口与页签栏。

---

## 1. 数据与状态管理

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

## 2. 界面与工具栏定制

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

## 3. 高级扩展与配置

| 属性 Prop | 类型 Type | 默认值 | 说明 Description |
| :--- | :--- | :---: | :--- |
| **`extensions`** | `(Extension \| ExtensionConfig)[]`| - | TipTap 风格可插拔扩展列表（如水印、自定义渲染器等） |
| **`upload`** | `SheetUploadConfig` | - | 图片 / 附件上传接口配置 |
| **`searchReplace`** | `{ enabled?: boolean, shortcut?: boolean }` | `{ enabled: true, shortcut: true }` | 查找与替换功能开关及快捷键配置 |
| **`defaultFontSize`**| `number` | `11` | 默认单元格字体大小 |
| **`rowHeaderWidth`** | `number` | `46` | 行号表头默认宽度 |
| **`columnHeaderHeight`**| `number` | `24` | 列标表头默认高度 |
