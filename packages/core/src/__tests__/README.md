# __tests__ — 单元测试

Vitest 测试，覆盖 core 无 UI 逻辑。

| 文件 | 覆盖 |
|------|------|
| `sheet-layout.test.ts` | rowId/colId、layout 初始化 |
| `adapter.test.ts` | Luckysheet 适配 |
| `history.test.ts` | undo/redo |
| `row-move.test.ts` | `moveRows`、index 映射 |
| `interaction.test.ts` | interaction 层会话与命中 |

运行：`pnpm test`（在 `packages/core` 目录）。
