# yjs — CRDT 与撤销

Yjs 相关的 transact 边界、UndoManager、origin 标记。

| 文件 | 用途 |
|------|------|
| `origins.ts` | `YOriginUser` / `YOriginSystem` — 区分用户编辑 vs 公式重算 |
| `transact.ts` | `transactUser`, `transactSystem` 包装 |
| `undo-manager.ts` | 绑定 `sheets` Y.Map 的 UndoManager，`canUndo`/`canRedo` |

## 语义

- **用户一步** → `transactUser` → 进入 undo 栈
- **公式重算、内部刷新** → `transactSystem` 或同 transact 内 `trackUndo: false`
- 连续输入合并：`captureTimeout`（默认 500ms）

恢复靠 Yjs patch 反演，**不是** Luckysheet 整表 JSON 快照。
