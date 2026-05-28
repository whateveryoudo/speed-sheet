# state — 表格状态

基于 **Yjs** 的可变状态层，v2 模型：`rowOrder` / `colOrder` + 稳定 `rowId`/`colId` 作为 cell 键。

## 文件

| 文件 | 用途 |
|------|------|
| `SheetState.ts` | 单元格读写、选区、行列尺寸、插删移、合并等 |
| `sheet-layout.ts` | 从快照初始化 layout、`rowId`/`colId` 索引 |

## 职责边界

- **只描述「数据是什么」**，不处理鼠标/键盘
- 变更应包在 `transactUser` / `transactSystem` 内以配合 UndoManager
- 命令入口在 `extension/core/*`，UI 通过 `sheet.chain()` 调用

## 与 Luckysheet 差异

Luckysheet 用二维 `flowdata` + 坐标；我们插删行只改 `rowOrder`，cell 键不变。
