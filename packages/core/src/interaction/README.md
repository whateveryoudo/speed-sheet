# interaction — 无 UI 交互层

存放**与框架、DOM 无关**的拖拽/导航 **Session** 状态机（`SelectDragSession`、`ResizeSession` 等）。

**DOM 绑定与编排**在 `@speed-sheet/view`（`SheetViewport` + `*Controller`），不在 vue3 composable 里重复实现。

框架层只负责：

1. 把 DOM 事件交给 `SheetViewport`（或 vue3 的 `useSheetCanvasView`）
2. 根据 controller 状态画 overlay（resize 线、移动提示等）
3. Session `commit` 已在 view 内调 `sheet.chain()`

## 文件

| 文件 | 用途 |
|------|------|
| `pointer.ts` | 鼠标坐标 → canvas / content 坐标 |
| `cell-pointer.ts` | 命中单元格、边界 clamp |
| `selection-utils.ts` | 选区包含判断、是否多格选区 |
| `selection-block.ts` | 整段移动行、批量改行高/列宽 |
| `select-drag-session.ts` | 框选拖拽状态机 |
| `resize-session.ts` | 行高/列宽拖拽预览与 commit |
| `row-move-session.ts` | 行 reorder 预览与 commit |
| `pointer-dispatch.ts` | mousedown 命中优先级、cursor 样式 |
| `context-menu-hit.ts` | 右键命中（行头/列头/单元格/框选） |
| `keyboard-nav.ts` | 方向键 / Tab / Enter / Delete 导航语义 |

## 不要放这里

- Vue `ref`、DOM `addEventListener`（在 `@speed-sheet/view`）
- 公式栏 / 内联 RichInput 同步（在 `vue3` `useSheetInlineEdit`）

## 复用方式

```ts
// 低层：直接用 Session（测试、自定义 UI）
import { RowMoveSession, pointerFromMouseEvent } from '@speed-sheet/core'

// 推荐：整页视口
import { SheetViewport } from '@speed-sheet/view'
```
