# extension/core — 内置扩展

随 `@speed-sheet/core` 默认加载的核心能力（见 `CORE_EXTENSIONS`）。

| 文件 | 命令示例 |
|------|----------|
| `selection.ts` | `selectCell`, `selectRange` |
| `history.ts` | `undo`, `redo`（Yjs UndoManager） |
| `clipboard.ts` | `copy`, `cut`, `paste` |
| `cell-editing.ts` | `setCellValue`, `clearSelection` |
| `row-col.ts` | `setRowHeight`, `moveRows`, `insertRows` |
| `merge.ts` | `mergeCells` / `unmergeCells`（逻辑见 `merge/MergeContext`） |
| `keyboard.ts` | 快捷键占位（方向键等由 UI 层处理） |

## 对照 Luckysheet

实现前可读 Luckysheet 对应 controller，但存储与 undo 机制按 v2 + Yjs 重写（见仓库 `.cursor/rules/reference-luckysheet.mdc`）。
