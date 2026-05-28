# merge — 合并单元格统一 API

## 用法

```ts
const mc = sheet.state.createMergeContext()
// 或
const mc = MergeContext.fromRanges(sheet.getMergeRanges())

mc.anchor(r, c)              // 写入/编辑落点
mc.rangeForHit(r, c)           // 点击选区
mc.displayBounds(selection)    // 表头、插入 N 行/列
mc.mergeAtFocus(selection)     // 是否显示「拆分」
mc.hasPartialMergeInRect(...)  // 粘贴/排序前校验
```

## 约定

- **数据**：`SheetState.merges` 存 `{ r, c, rs, cs }`（显示坐标）；**值只在锚点** `cells` 里。
- **渲染**：`renderSheet({ mergeCtx })` 或传 `merges`（内部会包成 `MergeContext`）。
- **禁止**在 UI 层直接 `buildMergeLookup(getMergeRanges())`，统一走 `createMergeContext()`。

## 文件

| 文件 | 职责 |
|------|------|
| `MergeContext.ts` | 对外门面 |
| `layout.ts` | 索引与几何 |
