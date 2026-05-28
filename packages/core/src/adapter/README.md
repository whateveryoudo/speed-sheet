# adapter — 格式适配

与外部格式的导入/导出，**不改变** core 主存储模型。

| 文件 | 用途 |
|------|------|
| `luckysheet-adapter.ts` | Luckysheet JSON ↔ v2 `WorkbookSnapshot` |

## 注意

- 适配的是**快照/文件格式**，不是 Luckysheet 运行时 `flowdata`
- 新导入路径应产出 `rowOrder`/`colOrder` + id 键单元格
