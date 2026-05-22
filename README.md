# speed-sheet

Headless spreadsheet engine (Luckysheet-compatible data model + Yjs). TipTap-style extensions.

## Packages

| Package | Role |
|---------|------|
| `@speed-sheet/shared` | Types, cell keys |
| `@speed-sheet/core` | Sheet, commands, canvas render — no UI |
| `@speed-sheet/vue3` / `@speed-sheet/react` | Framework adapters (headless) |
| `@speed-sheet/vue3-antd` | Optional Ant Design Vue toolbar |
| `@speed-sheet/extension-*` | Optional plugins |

## Develop

```bash
pnpm install
pnpm build
pnpm demo   # http://localhost:4000
```

Remote: `git@github.com:whateveryoudo/speed-sheet.git`

See [ARCHITECTURE.md](./ARCHITECTURE.md).
