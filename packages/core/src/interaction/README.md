# interaction — 无 UI 交互层

存放**与框架无关**的指针、键盘、拖拽会话逻辑。Vue `SheetCanvas` / React `SheetRenderer` 只负责：

1. 读取 DOM 坐标 → 调用本目录 API
2. 根据 preview 画 overlay
3. 在 `mouseup` 时用 commit 结果调 `sheet.chain()`

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

- Vue `ref`、DOM `addEventListener`
- 公式栏 / 内联 RichInput 同步（在 `vue3` composable）

## React 复用

```ts
import { RowMoveSession, pointerFromMouseEvent } from '@speed-sheet/core'
```
