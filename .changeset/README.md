# Changesets

本仓库使用 [Changesets](https://github.com/changesets/changesets) 管理 monorepo 独立发版。

## 何时需要添加 changeset

当你改动了需要发布到 npm 的子包时，在提交 PR 前运行：

```bash
pnpm changeset
```

按提示选择受影响的包（例如只选 `@speed-sheet/core`），以及 bump 类型（patch / minor / major）。

未选中的包（如 `@speed-sheet/react`）**不会**随本次发版更新。

## CI 流程

1. PR 合并到 `main` 且存在 pending changeset → Actions 自动开 **Version Packages** PR
2. 合并 Version PR → 自动 `pnpm build` + 发布有版本变更的包到 npm
