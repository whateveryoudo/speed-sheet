# @speed-sheet/view

框架无关的表格 **视口层**（对标 ProseMirror 的 `EditorView` / Tiptap 的 view 职责）：滚动、绘制调度、指针/键盘、框选与行列拖拽会话。

不含 Vue / React 依赖；`@speed-sheet/vue3` 与 `@speed-sheet/react` 只做薄胶水。

## 分层位置

```
@speed-sheet/core        模型、命令、renderSheet、interaction/* Session
        ↓
@speed-sheet/view        SheetViewport + controllers（本包）
        ↓
@speed-sheet/vue3        useSheetCanvasView + SheetCanvas + 内联编辑器 UI
@speed-sheet/react       直接 new SheetViewport（规划中）
```

## 入口

| 导出 | 说明 |
|------|------|
| **`SheetViewport`** | 编排类：layout、draw、scroll、pointer、keyboard、拖拽、右键、错误角标 |
| `SheetLayoutState` | scroll、GridLayout、GridMetrics |
| `CanvasDrawController` | rAF 绘制、`renderSheet` 调用 |
| `ScrollBarController` | 语雀式自定义滚动条 |
| `SelectionDragController` 等 | 各类 interaction 的 DOM 绑定 |
| `computeEditorBox` 等 | 内联编辑器定位（无 Vue） |

完整导出见 [`src/index.ts`](./src/index.ts)。

## SheetViewport 用法（React / 纯 DOM）

```ts
import { SheetViewport } from '@speed-sheet/view'

const viewport = new SheetViewport({
  getRoot: () => rootEl,
  getCanvas: () => canvasEl,
  getViewport: () => viewportEl,
  getScroll: () => scrollEl,
  getSheet: () => sheet,
  getRevision: () => revision,
  // …见 SheetViewportOptions
  editor: editorBridge,
})

viewport.attach()
// 模板事件：viewport.onPointerMouseDown、viewport.handleScroll、viewport.onKeyDown …
viewport.detach()
```

## Vue 侧

不要逐个 import 已删除的 `useSheetCanvasDraw` 等 hook；统一用：

- [`packages/vue3/src/composables/useSheetCanvasView.ts`](../vue3/src/composables/useSheetCanvasView.ts) — 唯一 viewport 胶水
- [`useSheetInlineEdit`](../vue3/src/composables/useSheetInlineEdit.ts) — `FormulaRichInput` 与公式点选

[`SheetCanvas.vue`](../vue3/src/components/SheetCanvas.vue) 只组装上述两者 + 模板。

## 目录

```
src/
  sheet-viewport.ts      # SheetViewport 编排
  layout/                # SheetLayoutState
  draw/                  # CanvasDrawController
  scroll/                # ScrollBarController
  input/                 # pointer、keyboard、拖拽、右键
  overlay/               # 错误提示、编辑器布局
  data/                  # 选区/单元格 helper
```
