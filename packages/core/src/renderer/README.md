# renderer — Canvas 渲染与布局

Headless 网格几何：可变行高/列宽、可见区域、Canvas 绘制、命中检测辅助。

## 文件

| 文件 | 用途 |
|------|------|
| `grid-layout.ts` | 视口、滚动、表头尺寸等 `GridLayout` |
| `grid-metrics.ts` | 行高/列宽累加、`rowAtY` / `colAtX` |
| `sheet-grid-metrics.ts` | 从 `SheetState` 构建 `GridMetrics` |
| `layout-metrics.ts` | 单元格坐标、选区框、冻结命中 |
| `canvas/` | Canvas 绘制管线（见下） |
| `resize-hit.ts` | 行/列 resize 边缘命中 |
| `row-move-hit.ts` | 行头命中、插入位置、移动后 index 映射 |

## `canvas/` 子目录

| 文件 | 用途 |
|------|------|
| `index.ts` | 对外 re-export（`@speed-sheet/core` 仍从此导出） |
| `render-sheet.ts` | `renderSheet` 主流程编排 |
| `render-env.ts` | 单帧绘制上下文 |
| `layout.ts` | `getVisibleRange`、`defaultLayout` |
| `cell-text.ts` | 文本测量、溢出、`drawCellText` |
| `draw-cell-content.ts` | 复选框、下拉、公式错误角标 |
| `draw-grid.ts` | 网格线 |
| `draw-cells.ts` | 单元格背景与内容 |
| `draw-headers.ts` | 行列头、角块、表头高亮 |
| `draw-selection.ts` | 选区、备注/筛选/公式引用/剪贴板 overlay |
| `draw-filter.ts` | 筛选标记与绿框 |
| `draw-freeze.ts` | 冻结分隔线 |
| `hit.ts` | `cellFromPoint`、`cellRect`、`colToLetter` |

## 与 interaction 的分工

- **renderer**：静态几何 + 绘制 + 单点命中
- **interaction**：拖拽过程的状态机与 commit 参数

## 使用方

- **绘制**：`@speed-sheet/view` 的 `CanvasDrawController` 在 rAF 中调用 `renderSheet`（由 `SheetViewport` 编排）。
- **Vue**：`SheetCanvas.vue` → `useSheetCanvasView` → `SheetViewport`。
- **React**：直接绑 `SheetViewport`（规划中）。
- 交互预览线（resize 引导线等）由框架模板 overlay 绘制，几何来自 view controller 状态。
