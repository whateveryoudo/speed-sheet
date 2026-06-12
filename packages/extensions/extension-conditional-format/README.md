# @speed-sheet/extension-conditional-format

条件格式扩展：规则存储、命令、条件求值与渲染 map 构建。

## 导出

| 符号 | 说明 |
|------|------|
| `ConditionalFormatExtension` | TipTap 风格 Extension |
| `getCfRules(sheet)` | 当前 sheet 规则列表 |
| `buildCfRenderMaps(rules, state, cells)` | 视口 cell → `cellStyles` / `dataBars` Map |
| `formatRangeA1` / `parseRangeA1` | 应用范围 A1 互转 |
| `formatCfRuleLabel` / `formatCfRuleRange` | 侧栏展示文案 |

## 命令

- `addCfRule` · `updateCfRule` · `removeCfRule` · `clearCfRules`

## 持久化

当前 sheet Y.Map 根键：`sheetConditionalFormats`（`CfRule[]`）。

## 文档

- [docs/conditional-format-notes.md](../../../docs/conditional-format-notes.md)
