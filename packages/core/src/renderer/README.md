# renderer — Canvas 渲染与布局

Headless 网格几何：可变行高/列宽、可见区域、Canvas 绘制、命中检测辅助。

## 文件

| 文件 | 用途 |
|------|------|
| `grid-layout.ts` | 视口、滚动、表头尺寸等 `GridLayout` |
| `grid-metrics.ts` | 行高/列宽累加、`rowAtY` / `colAtX` |
| `sheet-grid-metrics.ts` | 从 `SheetState` 构建 `GridMetrics` |
| `layout-metrics.ts` | 布局相关的度量辅助 |
| `canvas-renderer.ts` | `renderSheet`、`cellFromPoint`、`cellRect`、文本测量 |
| `resize-hit.ts` | 行/列 resize 边缘命中 |
| `row-move-hit.ts` | 行头命中、插入位置、移动后 index 映射 |

## 与 interaction 的分工

- **renderer**：静态几何 + 绘制 + 单点命中
- **interaction**：拖拽过程的状态机与 commit 参数

## 使用方

`packages/vue3` 的 `SheetCanvas.vue`、`packages/react` 的 `SheetRenderer` 调用 `renderSheet` 绘制；交互预览线由 DOM overlay 绘制。
