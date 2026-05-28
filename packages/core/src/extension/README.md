# extension — 插件体系

TipTap 风格的 Extension：注册命令、快捷键、存储、生命周期。

## 结构

| 路径 | 说明 |
|------|------|
| `Extension.ts` | 基类与 `Extension.create()` |
| `types.ts` | 命令上下文、链式类型 |
| `index.ts` | 导出与 `CORE_EXTENSIONS` 列表 |
| [`core/`](./core/) | 内置扩展（选区、历史、剪贴板、行列等） |

## 扩展方式

```ts
const sheet = new Sheet({
  extensions: [MyExtension, FormulaExtension],
})
sheet.chain().myCommand().run()
```

## 原则

- 用户可见的**一步操作**对应一条（或一组）command + 明确的 transact 边界
- 新功能优先加 extension，而不是直接改 `SheetState` 公开 API
