# Sheet 存储 v2：稳定 id + 行列顺序表

## Y.Doc 结构

```text
sheets["0"] (Y.Map)
├── name
├── meta (Y.Map)
│     rowCount, colCount          // 表格尺寸（数字，同 Luckysheet row/column）
├── rowOrder (Y.Array<string>)    // 显示行号 r → rowId（稳定，如 r_<nanoid12>）
├── colOrder (Y.Array<string>)    // 显示列号 c → colId（稳定，如 c_<nanoid12>）
├── cells (Y.Map)
│     "r_<id>:c_<id>" → Y.Map { v, f, ... }   // 只存有值的格；id 与显示行号无关
├── merges, rowHeight, colWidth, ...
└── _selection
```

## 读 / 写（对外仍是 r,c）

```text
getCell(5, 3)
  → rowId = rowOrder[5]
  → colId = colOrder[3]
  → cells["rowId:colId"]
```

## 插行 / 插列

| 操作 | 改动 |
|------|------|
| `insertRows(4, 1)` | `rowOrder.insert(4, [newRowId])`，**cells 的 key 不变** |
| `insertCols(4, 1)` | `colOrder.insert(4, [newColId])`，**cells 的 key 不变** |
| `deleteRows` | 删掉对应 `rowId` 下所有 `rowId:*`，再从 `rowOrder` 删除 |
| `deleteCols` | 删掉对应 `colId` 下所有 `*:colId` |

`rowHeight` / `colWidth` 仍按**显示下标**字符串存储，插行列时 `shiftIndexMap`（与旧版一致）。

`merges` 仍用显示坐标 `{ r,c,rs,cs }`，插行列时会 remap。

## 兼容

- 导入 Luckysheet：直接生成 v2 布局（`initLayoutFromRcEntries`）。
- 不做旧 `R{r}_C{c}` 迁移；新数据一律 `rowId:colId` + order 数组。
- 导出快照 / Luckysheet：仍输出 `R{r}_C{c}` 键（`toSnapshot` / `getAllCells`）。

## 代码入口

| 文件 | 职责 |
|------|------|
| `packages/shared/src/cell-id.ts` | `cellIdKey`, `parseCellIdKey` |
| `packages/core/src/state/sheet-layout.ts` | 迁移、初始化、删行/列清 cell |
| `packages/core/src/state/SheetState.ts` | 对外 API |

## 与公式层的关系

- 存储层插行 **不改** `cells` 的 `rowId:colId` key。
- 公式在 `f` 里用内部 `#r_…:c_…#` 引用；显示 A1 由 `extension-formula` 按当前 `rowOrder` 换算。
- 插删行列须走 `sheet.chain().insertRows`（`FormulaExtension` 会先 `notifyBeforeLayoutChange` 再重算）。
- 维护说明见：[`docs/layout-and-formula-notes.md`](../../../docs/layout-and-formula-notes.md)
