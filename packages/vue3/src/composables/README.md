# vue3 composables

## Canvas 渲染层

| 文件 | 职责 |
|------|------|
| `useSheetCanvasView.ts` | **唯一** viewport 胶水：绑定 `@speed-sheet/view` 的 `SheetViewport` |
| `useSheetInlineEdit.ts` | 内联编辑器 + 公式点选（Vue 组件 `FormulaRichInput`） |
| `useSheetViewportContext.ts` | provide/inject 供 overlay 读取 layout/scroll |

逻辑在 `@speed-sheet/view`（`SheetViewport` + controllers），vue3 只保留 Vue 响应式与编辑器 UI。

## 文档 / 协同

| 文件 | 职责 |
|------|------|
| `useSheet.ts` | Sheet 实例生命周期 |
| `useFormulaEdit.ts` | 公式栏编辑上下文 |
| `yjs/*` | 协同 |
