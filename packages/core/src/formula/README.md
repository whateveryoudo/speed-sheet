# formula — 公式（core 内无实现）

**公式解析与计算不在 core 内实现**，请使用独立包：

- [`@speed-sheet/extension-formula`](../../../extension-formula/) — 公式 extension、AST、依赖图、求值

## 为何不在 core

- 公式是可选能力，避免 core 体积与循环依赖
- core 只保留单元格字段 `f`/`v`/`m` 的存储与 `SheetState.setCell`

## 相关文档

- 仓库根目录 `docs/layout-and-formula-notes.md`
- `.cursor/rules/reference-luckysheet.mdc` 公式章节
