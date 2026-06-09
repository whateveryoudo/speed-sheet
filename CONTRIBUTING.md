# 提交与发版（Changesets）

本 monorepo 使用 **Changesets** 独立管理各 `@speed-sheet/*` 子包版本。  
只有你在 changeset 里点名的包才会 bump / 发布；例如只改 `core` 时，`react` 可以不动。

## 日常开发

改完需要发布的代码后，在仓库根目录执行：

```bash
pnpm changeset
```

1. 空格选择受影响的包（可多选，也可只选一个）
2. 为每个包选择 bump 类型：`patch` / `minor` / `major`
3. 写一句变更摘要

会在 `.changeset/` 下生成一个 md 文件，随 PR 一起提交。

### bump 怎么选

| 类型 | 场景 | 示例 |
|------|------|------|
| patch | bugfix、小调整 | `0.1.0 → 0.1.1` |
| minor | 新功能、向后兼容 | `0.1.0 → 0.2.0` |
| major | breaking change | `0.1.0 → 1.0.0` |

## CI 发版流程

```text
PR 合并到 main（含 .changeset/*.md）
    ↓
GitHub Actions 创建/更新「Version Packages」PR
    ↓
Version PR 合并（自动改各包 version + CHANGELOG）
    ↓
Actions 执行 pnpm release → 只 publish 版本有变的包
```

## 发版范围

可发布包：

- `@speed-sheet/shared`
- `@speed-sheet/core`
- `@speed-sheet/vue3`
- `@speed-sheet/vue3-antd`
- `@speed-sheet/react`
- `@speed-sheet/extension-*`

不会发布：`@speed-sheet/demo`、根仓库（`private`）。

## 内部依赖

`updateInternalDependencies: patch`：例如 `core` 发 minor 时，依赖它的 `vue3` 会在 workspace 里自动 patch bump 依赖版本（若 `vue3` 本身也在本次 changeset 中）。

## Secrets

| Secret | 说明 |
|--------|------|
| `NPM_TOKEN` | npm Automation token，需有 `@speed-sheet` 发布权限 |

## 首次发版（0.1.0）

各子包基线版本为 `0.1.0`。首次发布前对需要上线的包各加一个 changeset（通常选 `minor` 作为首次 `0.1.0` 对外发布）。

不需要发布的包（如 `@speed-sheet/react`）**不要**写进 changeset 即可。
