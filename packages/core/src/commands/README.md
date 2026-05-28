# commands — 命令调度

`CommandManager` 负责扩展注册的 command 聚合与 `chain().foo().run()` 链式调用。

## 文件

| 文件 | 用途 |
|------|------|
| `CommandManager.ts` | 注册/执行命令、`can()` 查询 |

## 使用

```ts
sheet.chain().selectCell({ r: 0, c: 0 }).setCellValue({ r: 0, c: 0, value: 'hi' }).run()
sheet.can().undo()
```

UI 层（Vue/React）**不应**直接改 `SheetState`，应走 command 以保持 undo、协同与扩展一致。
