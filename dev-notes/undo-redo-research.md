# Undo / Redo 调研（Luckysheet 对照 + speed-sheet 方案）

> 工具栏已有 `undo` / `redo` 按钮（`chain().undo()`），但 `HistoryExtension` 仍为 **TODO 空实现**。

**设计原则**：Luckysheet 提供 **交互与「一步」语义** 的参考；speed-sheet 底层是 **Yjs + 稳定 rowId**，机制上 **不复制** `jfundo` 快照栈，而用更适合 v2 的实现（见 §3–§4）。Luckysheet 机制未必最优，但产品行为尽量与 WPS/语雀一致。

---

## 0. 交互 vs 机制对照表（实现时按此决策）

| 用户可见行为（应对齐 Luckysheet/商业表） | Luckysheet 机制 | speed-sheet 更优机制 |
|----------------------------------------|-----------------|----------------------|
| Ctrl+Z 撤销上一步编辑 | `jfundo.pop` + `jfrefreshgrid(curdata)` | `UndoManager.undo()` 反演 Y 事务 |
| 新编辑后 redo 不可用 | `clearjfundo` 清空 redo 栈 | UndoManager 默认行为 + 新 `transact` |
| 连续打字算一步还是多步 | 多次 `datachange`（常未合并） | `captureTimeout` / `stopCapturing()` **可做得比它更好** |
| 插删一行撤销后行列与公式恢复 | `addRC`/`delRC` 存整表 `data/curdata` | 单次 `transact`：只 patch `rowOrder` + 相关 `cells`；id 键 **不重命名** |
| 插行后 `=SUM(A1:A3)` 引用跟随 | 坐标矩阵整体位移 + 公式重绑 | `rowOrder` 插入 + `formula-bindings` 按 rowId；undo 反演 order |
| 公式重算结果 | undo 时 `formulaHistoryHanddler` 手动维护函数图 | recalc 用 **非 tracked origin** 或与用户编辑同一 transact，避免「只撤 v 不撤 f」 |
| 撤销后选区 | 历史项带 `range`，恢复选区 | `notifyUpdate` 后由 selection 读当前格；可选存 meta（Phase B） |
| 协同他人编辑 | 另一套 `server.saveParam` | 仅 `trackedOrigins` 含本地 origin，远端不进栈 |
| 切换 sheet 再撤销 | 历史项带 `sheetIndex`，先 `changeSheetExec` | 跟踪 `sheets` Y.Map 或 per-sheet UndoManager（待选） |

**禁止**：为「像 Luckysheet」而把 `WorkbookSnapshot` / 全表 JSON 压进自定义栈 — 内存与 id 语义都不划算。

---

## 0.1 三种 Undo 范式（你对「栈里存操作」的直觉 vs 现实）

很多人说的「栈里存 **Command / Step**，不是整份 JSON」——在 **ProseMirror / Yjs** 里成立；**Luckysheet 是混合型**，不要和它混为一谈。

| 范式 | 栈里实际存什么 | 撤销时怎么做 | 代表 |
|------|----------------|--------------|------|
| **A. 可逆操作（Command / Step）** | 小对象：`type` + **invert 用的 Step**，外加 position map | 对当前文档 **apply 逆操作**（可能要 remap） | ProseMirror `Item { step, map, selection }` |
| **B. CRDT 更新（Patch）** | Yjs 编码后的 **structural binary update**（不是业务 JSON） | `UndoManager.undo()` 在 Doc 上反演 patch | Yjs `UndoManager` |
| **C. 带类型的状态快照（Luckysheet）** | `{ type: "datachange", data, curdata, range, config… }` | `controlHistory` 按 `type` 选刷新函数，用 **`curdata` 写回** | `refresh.js` → `jfredo.push` |

**Luckysheet 不是纯 A**：有 `type`（像命令），但 **`data` / `curdata` 往往是区域或整表 `flowdata` 的拷贝**（`$.extend(true, …)`），体积远大于一个 Step。例如 `datachange`：

```javascript
Store.jfredo.push({
  type: "datachange",
  data: Store.flowdata,      // 改后（常指向当前表）
  curdata: data,             // 改前区域/表
  range, config, curConfig, …
});
```

所以：它的「操作类」是 **分发用的标签 + 前后状态对**，不是 ProseMirror 那种「只存 insert 3 个字符的逆变换」。

**speed-sheet 应靠近 A + B，不靠近 C 的全表快照**：

- 机制：**Yjs UndoManager（B）** — 栈里是 CRDT update，不是 `WorkbookSnapshot`。
- 语义：**对齐 ProseMirror 的「一步」** — `transact` 边界、`captureTimeout` 合并连续输入（类似 Tiptap `newGroupDelay: 500`）。
- 交互：仍对照 Luckysheet **用户感受**（§0 表）。

### ProseMirror（Tiptap 底层）

- 包：[`prosemirror-history`](https://github.com/ProseMirror/prosemirror-history)（[API `history()`](https://prosemirror.net/docs/ref/#history)）。
- 核心结构（`history.ts`）：
  - 两条链：`done` / `undone`（`Branch` 链表）。
  - 每项 `Item`：`step`（**已 invert 的 Step**）、`map`（`StepMap`）、可选 `selection` bookmark。
  - 撤销：取出 item → 用累积的 **position maps** 把 step **map 到当前文档** → `dispatch` 逆 transaction。
- 设计要点（[Marijn 协同博文](https://marijnhaverbeke.nl/blog/collaborative-editing.html)）：
  - Step 必须 **`invert()`**，不能「滚到旧 state 指针」——协同下旧 state 已不存在。
  - 历史会 **compact**：把逆 step 前推到当前版本，丢掉中间 map，防内存涨。
- Tiptap：[`UndoRedo` 扩展](https://tiptap.dev/docs/editor/extensions/functionality/undo-redo) 即包一层 `prosemirror-history`；`depth` / `newGroupDelay`（默认 500ms）对应「连续输入一步」。**开 Collaboration 时要关掉 UndoRedo**，改用协同自带 history（与「只撤自己的改动」一致）。

### 和 speed-sheet 的类比

| ProseMirror | speed-sheet (Yjs v2) |
|-------------|----------------------|
| `Step` / `Transaction` | `ydoc.transact(() => …)` 里对 `rowOrder` / `cells` 的修改 |
| `step.invert(doc)` | UndoManager 自动记录并反演 **Y 更新**（无需手写 invert） |
| `newGroupDelay` | `UndoManager` 的 `captureTimeout` / `stopCapturing()` |
| 协同：只撤本地 + remap | `trackedOrigins: localOnly`；远端不进栈 |
| 公式/装饰不进入用户一步 | `recalculate` 用 **非 tracked origin**（类似 PM 的 meta / 不记入 history 的 append） |

**不必**自研一套 `InsertRowCommand.invert()`，除非 UndoManager 在某类场景不够用（例如要把选区恢复也编进栈）——那时再考虑 **meta + 小 Command**，仍不要存整表 JSON。

---

## 1. Luckysheet 怎么做（无 UI 核心）

### 1.1 数据结构

```text
Store.jfundo  — 撤销栈（pop → 执行 undo）
Store.jfredo  — 重做栈（pop → 执行 redo）
Store.clearjfundo — 新操作时是否清空 redo（标准行为）
```

监听栈长度控制按钮禁用：`controllers/listener.js`（proxy `jfundo` / `jfredo`）。

### 1.2 记录时机

在 **`global/refresh.js`**（及 `handler.js`、`sheetmanage.js` 等）里，每次改表后若 `clearjfundo` 为 true：

- 清空 `jfundo`（新分支切断 redo）
- 向 `jfredo` **push** 一条 `redo` 对象

每条记录通常包含：

| 字段 | 含义 |
|------|------|
| `type` | 操作类型（见下表） |
| `data` / `curdata` | 改后 / 改前 的 **整块 flowdata 或区域数据** |
| `range` / `dataRange` | 影响选区 |
| `config` / `curconfig` | 行高列宽、合并等 |
| `sheetIndex` | 工作表 id |

常见 `type`（`controlHistory.js` 分支）：

- `datachange` — 单元格改值/公式  
- `rangechange` — 范围填充  
- `resize` — 行高列宽  
- `cellRowChange` / `extend` / `dele` — 行列结构  
- `addRC` / `delRC` — 插删行列  
- `pasteCut` / `deleteCell` — 剪贴板  
- `addSheet` / `copySheet` — 工作表  

### 1.3 执行时机

**`controllers/controlHistory.js`**：

- `undo()`：`jfundo.pop()` → `jfredo.push` → 按 `type` 调 `jfrefreshgrid` / `jfrefreshgrid_adRC` 等，用 **`curdata`（旧状态）** 写回  
- `redo()`：反向，用 `data`（新状态）写回  
- 公式： `formulaHistoryHanddler` 在 undo/redo 时 `delFunctionGroup` / `insertUpdateFunctionGroup`

特点：**命令式快照 + 全表/区域刷新**，不是 CRDT，协同靠另有一套 `server.saveParam`。

**为何不宜照搬**：`flowdata` 是显示坐标下的稠密/稀疏矩阵；插行要拷贝 `data/curdata` 并维护大量 `type` 分支。我们是 **order 数组 + 稀疏 `cells[id]`**，撤销应是 **Y 结构反演**，天然更小、且与协同模型一致。Luckysheet 的代价是历史对象巨大、公式图要 `formulaHistoryHanddler` 补刀 — 我们应在 **transact 边界** 上一次性做对。

### 1.4 API 命名注意

`global/api.js` 里 `undo()` 调的是 `controlHistory.redo`，`redo()` 调 `undo` — 与栈命名相反，读代码时以 **栈 pop 方向** 为准。

---

## 2. 公开库 / 常见方案

| 方案 | 适用 | 说明 |
|------|------|------|
| **[Yjs UndoManager](https://docs.yjs.dev/api/undo-manager)** | **推荐（speed-sheet 已用 Yjs）** | 跟踪 `Y.Doc` 上 transaction；`undo()`/`redo()`；可 `captureTimeout` 合并输入；协同友好 |
| **y-utility / y-indexeddb** | 持久化 + 协同 | 与 UndoManager 配合，非替代 |
| **Command 模式自研栈** | 无 CRDT 时 | 类似 Luckysheet，每条存 before/after 快照；工作量大 |
| **immer + patches** | 普通 JSON 状态 | 不适合当前 Y.Map 单元格模型 |
| **ProseMirror / OT 库** | 文档编辑 | 表格需自建 model，不直接套用 |

**结论**：内部已是 **Y.Doc**，优先 **UndoManager 包一层**，不要在 core 复刻 Luckysheet 的 `flowdata` 双份快照。

---

## 3. speed-sheet 现状

```text
packages/core/src/extension/core/history.ts
  undo / redo → TODO: wire Yjs UndoManager

packages/vue3-antd/src/menus/toolbar/undo.vue → sheet.chain().undo().run()
```

数据变更路径：`SheetState` / `CommandManager` → `ydoc.transact(...)`（部分命令已包 transaction）。

公式、插删行列、协同：均落在同一 `ydoc` 上，**适合统一 UndoManager**。

---

## 4. 推荐实现路线（对齐「交互」，机制用 Yjs）

实现 checklist（每个 PR 自问）：

1. 读过 Luckysheet 对应路径了吗？（弄清 **用户应感受到什么**）  
2. 一步撤销的边界在我们的模型里对应哪次 `transact`？  
3. 公式/重算会不会多占一步？（origin 分离或同事务）  
4. 插删行列是否只动 `rowOrder`/`colOrder`，且 undo 不会误删稳定 id 上的 cell？  
5. 若与 Luckysheet **机制** 不同但 **交互** 一致，是否在 DEVLOG/PR 写一句？

### Phase A — 最小可用

1. `Sheet` 构造时创建 `Y.UndoManager(ydoc.getMap('sheets'), { trackedOrigins: new Set([localOrigin]) })`  
2. 本地 mutation 使用固定 `origin`（如 `speed-sheet-local`），避免协同远端进栈。  
3. `HistoryExtension.undo/redo` 调 `undoManager.undo()` / `redo()`，再 `notifyUpdate()`。  
4. 工具栏按钮根据 `undoManager.undoStack` / `redoStack` 长度禁用（对齐 `listener.js`）。  
5. 键盘：`Ctrl+Z` / `Ctrl+Y`（`registKeyMap` 已有文案）。

### Phase B — 体验对齐 Luckysheet

| 行为 | Luckysheet | Yjs 做法 |
|------|------------|----------|
| 连续输入合并为一步 | 多次 `datachange` 可合并 | `captureTimeout: 500` 或输入结束 `stopCapturing()` |
| 插删行列一步 | `addRC`/`delRC` 单条 | 单次 `transact` 包整段 insertRows |
| 公式重算不进栈 | 常伴随 datachange | 公式写 `v` 与 `f` 同一 transact；或 recalc 用不被 track 的 origin |
| 切换 sheet | 历史项带 `sheetIndex` | UndoManager 跟踪整个 `sheets` map 或 per-sheet manager |

### Phase C — 公式 / 协同

- 公式 `recalculateWorkbook`：用 **不跟踪** 的 origin，避免一步撤销只回滚 `v` 不回滚 `f`（需实测统一 transact）。  
- 协同：仅跟踪本地 origin；远端更新不进 undo 栈。  
- 可选：`UndoManager` 事件驱动 UI revision（与 Luckysheet proxy 栈长度类似）。

### 不建议

- 照搬 `controlHistory.js` 的 `type` 分支 + `jfrefreshgrid`（与 v2 架构冲突）。  
- 用 `WorkbookSnapshot` JSON 全量压栈（内存与序列化成本高）。

---

## 5. 实现前 Luckysheet 必读清单（Undo 相关）

1. `src/controllers/controlHistory.js` — 全文扫 `type` 分支  
2. `src/global/refresh.js` — 搜 `jfredo.push`、`clearjfundo`  
3. `src/controllers/sheetmanage.js` — 工作表增删历史  
4. `src/controllers/rowColumnOperation.js` — 插删行列与历史的衔接  
5. `src/global/formula.js` — `formulaHistoryHanddler`  
6. `src/controllers/keyboard.js` — 快捷键绑定  

---

## 6. 与 `.cursor/rules` 的关系

已增加 **`reference-luckysheet.mdc`**：任何新功能（含 undo）先查 Luckysheet 无 UI 逻辑，再在 speed-sheet 用 Yjs/id 模型实现。

---

## 7. 下一步（开发任务拆分）

- [x] `Sheet` 持有 `UndoManager`（`HistoryExtension`），暴露 `canUndo()` / `canRedo()`  
- [x] 实现 `history.ts` undo/redo（`chain().undo/redo`）  
- [x] 用户编辑 `transactUser`（`YOriginUser`）；导入/布局/公式重算 `transactSystem`  
- [x] 基础测试 `packages/core/src/__tests__/history.test.ts`  
- [x] 工具栏 disabled + `SheetCanvas` Ctrl+Z / Ctrl+Y  
- [ ] Phase B：插行+公式联动一步撤销、选区恢复、`stopHistoryCapture` 在公式栏接入  
- [ ] 公式扩展 E2E：改值 → 插行 → undo 后 `f`/`v` 与 A1 显示  
