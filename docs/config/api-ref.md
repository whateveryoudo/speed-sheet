# 组件 Ref 与 API 实例

在 Vue 3 项目中，为 `<SpeedSheet ref="sheetRef" />` 绑定 `ref` 后，可以通过 `sheetRef.value` 访问组件向外暴露的所有 API 实例与控制方法。

---

## 一、组件 Expose 结构概览

在组件内部通过 `defineExpose` 暴露了以下对象：

```typescript
const sheetRef = ref<InstanceType<typeof SpeedSheet> | null>(null)

// 挂载后通过 sheetRef.value 访问：
sheetRef.value?.sheet        // Ref<Sheet | null> -> 核心引擎实例（最常用）
sheetRef.value?.switchSheet  // (sheetId: string) => void -> 快捷切换工作表
sheetRef.value?.addSheet     // (name?: string) => string -> 快捷新建工作表
sheetRef.value?.viewportEl   // ComputedRef<HTMLElement | null> -> Canvas 视口 DOM 容器
sheetRef.value?.revision     // Ref<number> -> 视口重绘响应式版本号
```

---

## 二、核心引擎实例方法 (`sheetRef.value.sheet`)

通过 `const sheet = sheetRef.value?.sheet`，可直接调度 Speed Sheet 核心引擎。

### 1. 快捷读写 API (对照 Luckysheet 习惯)

为了方便熟悉 Luckysheet 或 Excel 的开发者上手，Speed Sheet 在引擎层内置了直观的快捷读写门面：

| 方法名称 | 参数 | 返回值 | 对照 Luckysheet API | 功能说明 |
| :--- | :--- | :---: | :--- | :--- |
| **`getCellValue(r, c)`** | `r: number, c: number` | `string \| number \| null` | `luckysheet.getCellValue(r, c)` | 获取指定单元格的显示文本或数值。 |
| **`setCellValue(r, c, value)`** | `r: number, c: number, value: string \| number` | `void` | `luckysheet.setCellValue(r, c, v)` | 更新指定坐标单元格的内容。 |
| **`setRange(range)`** | `range: { row: [number, number], column: [number, number] }` | `void` | `luckysheet.setRange(range)` | 设置当前激活选区范围。 |
| **`clearRange(range?)`** | `range?: LuckysheetRange` | `void` | `luckysheet.clearRange(range)` | 清空指定选区或当前选区的单元格内容。 |
| **`insertRow(row?, count?)`** | `row?: number, count = 1` | `void` | `luckysheet.insertRow(row, count)` | 在指定行（默认当前选区首行）插入指定数量的行。 |
| **`deleteRow(row?, count?)`** | `row?: number, count = 1` | `void` | `luckysheet.deleteRow(row, count)` | 删除指定行（默认当前选区行）。 |
| **`insertColumn(col?, count?)`** | `col?: number, count = 1` | `void` | `luckysheet.insertColumn(col, count)` | 在指定列插入指定数量的列。 |
| **`deleteColumn(col?, count?)`** | `col?: number, count = 1` | `void` | `luckysheet.deleteColumn(col, count)` | 删除指定列。 |
| **`copy()`** | - | `void` | `luckysheet.copy()` | 复制当前选区内容至内置剪贴板。 |
| **`cut()`** | - | `void` | `luckysheet.cut()` | 剪切当前选区。 |
| **`paste()`** | - | `void` | `luckysheet.paste()` | 将剪贴板内容粘贴至当前激活焦点。 |

---

### 2. 数据转换与导出 API

| 方法名称 | 返回值 | 功能说明 |
| :--- | :---: | :--- |
| **`toLuckysheetFile()`** | `LuckysheetFile \| null` | **中转导出为 Luckysheet 格式 JSON 数组**。<br>包含各 sheet 的 `name`, `data`, `config`, `celldata` 等，便于兼容老系统存库。 |
| **`toSnapshot()`** | `WorkbookSnapshot \| null` | **导出原生 v2 快照**。<br>结构精简紧凑，性能最佳，推荐新项目持久化存储使用。 |
| **`getYDoc()`** | `Y.Doc` | **获取底层的 Yjs 协同文档实例**。<br>用于外部自定义通信挂载（如接入 `y-websocket` 或企业自有协同通道）。 |

---

### 3. 多工作表管理 API (Sheets)

| 方法名称 | 参数 | 返回值 | 功能说明 |
| :--- | :--- | :---: | :--- |
| **`getActiveSheetId()`** | - | `string` | 获取当前正在浏览的工作表 ID。 |
| **`getSheetIds()`** | - | `string[]` | 获取所有工作表的 ID 列表。 |
| **`getVisibleSheetIds()`**| - | `string[]` | 获取所有未被隐藏的工作表 ID 列表。 |
| **`switchSheet(sheetId)`**| `sheetId: string` | `void` | 切换到指定 ID 的工作表并触发视口重绘。 |
| **`addSheet(name?)`** | `name?: string` | `string` | 新增工作表并直接切换过去，返回新建的 sheetId。 |
| **`renameSheet(id, name)`**| `sheetId: string, name: string` | `void` | 重命名指定工作表。 |
| **`duplicateSheet(id)`** | `sheetId: string` | `string` | 复制指定工作表副本，返回新 sheetId。 |
| **`deleteSheet(id)`** | `sheetId: string` | `void` | 删除指定工作表（至少保留一张表）。 |
| **`setSheetHidden(id, hidden)`** | `sheetId: string, hidden: boolean` | `void` | 设置工作表的显隐状态。 |
| **`setSheetTabColor(id, color)`**| `sheetId: string, color: string \| null` | `void` | 设置工作表在底部页签上的标记颜色。 |
| **`reorderSheets(orderedIds)`** | `orderedIds: string[]` | `void` | 调整工作表的排序顺序（如拖拽排序）。 |

---

### 4. 链式命令调用 (`chain()`)

Speed Sheet 内部集成了 TipTap 风格的链式调度体系，支持原子化事务提交：

```typescript
// 连续设置多个单元格或属性，一次性执行
sheet.chain()
  .setCell(0, 0, {
    v: '总计',
    m: '总计',
    bl: 1,           // 粗体
    bg: '#fafafa',   // 背景色
    ht: 0,           // 居中对齐
  })
  .setCellFormula({
    r: 0,
    c: 1,
    formula: '=SUM(B2:B10)',
  })
  .run()
```

---

### 5. 底层状态查询 (`sheet.state`)

通过 `sheet.state`，可以直接只读检索视口布局与单元格元数据：

```typescript
// 获取指定行列位置的单元格元数据对象
const cellData = sheet.state.getCellData(r, c)

// 获取当前用户选区坐标
const selection = sheet.state.getSelection()
// selection: { row: [start, end], column: [start, end], anchor: { r, c } }

// 获取当前行高与列宽
const rowHeight = sheet.state.getRowHeight(r)
const colWidth = sheet.state.getColWidth(c)

// 获取表格上所有的合并单元格区域
const merges = sheet.state.getMergeRanges()
```
