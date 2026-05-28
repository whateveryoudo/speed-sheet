# vue3 composables — Canvas 交互绑定

Vue 层 composable，把 `@speed-sheet/core` 的 headless 逻辑接到 DOM / 响应式状态。

## SheetCanvas 相关

| 文件 | 用途 |
|------|------|
| `useSheetLayout.ts` | scroll、GridLayout、GridMetrics、layoutForHit |
| `useSheetCanvasData.ts` | 选区/单元格 derived state、applySelectRange |
| `useSheetCanvasPointer.ts` | canvas mousemove/mousedown/dblclick/leave |
| `useSheetCanvasDraw.ts` | Canvas 绘制、`scheduleDraw`、ResizeObserver |
| `useSheetResizeDrag.ts` | 行高/列宽拖拽预览 + commit |
| `useSheetRowMove.ts` | 行 reorder 预览 + commit |
| `useSheetSelectionDrag.ts` | 框选拖拽 session + 单元格命中 |
| `useSheetDocumentDrag.ts` | document 级 mousemove/up（框选 + 公式点选共用） |
| `useSheetContextMenu.ts` | 右键菜单命中与选区 |
| `useSheetInlineEdit.ts` | 单元格内联编辑、公式栏双向同步、公式点选拖拽 |
| `useSheetCellErrorTip.ts` | 公式错误 hover 提示 |
| `useSheetKeyboard.ts` | 快捷键（复制/撤销/方向键等） |

## 公式

| 文件 | 用途 |
|------|------|
| `useFormulaEdit.ts` | 公式栏 inject/provide 上下文 |
| `useFormulaCanvas.ts` | 外壳层公式选点模式（非 SheetCanvas 专用） |

## 原则

- **core**：状态机 + 几何 + commit 参数
- **composable**：`ref`、`document` 监听、`sheet.chain()` 调用
- **SheetCanvas.vue**：组合 composable + template
