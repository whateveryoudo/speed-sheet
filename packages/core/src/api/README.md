# api — 兼容 API

Luckysheet 风格的高层 API，便于迁移旧代码或 demo。

| 文件 | 用途 |
|------|------|
| `sheet-compat.ts` | `getRange`、`getCellValue` 等与 Luckysheet 命名接近的方法 |

新代码推荐优先使用 `sheet.chain()`；本目录方法内部也委托给 state / commands。
