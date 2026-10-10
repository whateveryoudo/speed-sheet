# Speed-Sheet 视口与内联编辑架构设计文档

本文档详细记录 `@speed-sheet/view` 与 `@speed-sheet/vue3` 之间的分层设计、交互时序重构背景、以及单向数据流规范，防止后续迭代再次陷入循环依赖与时序死结。

---

## 一、 整体分层定位

```text
@speed-sheet/core
    │  (模型、命令、renderSheet Canvas 绘制、interaction 会话算法)
    ▼
@speed-sheet/view
    │  (框架无关的视口总控：SheetViewport、滚动、指针、拖拽选区、键盘、坐标计算)
    ▼
@speed-sheet/vue3
    │  (Vue 3 响应式薄胶水：useSheetCanvasView 统一纳管视口与内联编辑状态)
    ▼
@speed-sheet/vue3-antd
       (产品业务 UI：SpeedSheet 组装 AntD 工具栏、右键菜单、公式栏等)
```

- **`core`**：只负责数据模型与底层绘图逻辑（`renderSheet` 纯 Canvas 绘制），不接触框架。
- **`view`**：纯 TypeScript 编写的宿主交互总控层（对标 ProseMirror 的 `EditorView`），提供给 Vue 3 和 React 共享。
- **`vue3`**：纯响应式胶水层，负责将 `view` 的事件与状态桥接为 Vue 的 `computed` / `ref`。
- **`vue3-antd`**：具体的业务界面呈现。

---

## 二、 历史遗留问题剖析：时序死结（Anti-Pattern）

在重构前，代码曾出现过严重的**“鸡生蛋、蛋生鸡”时序死循环**：

### 1. 为什么会互为因果？
在电子表格的真实交互中，画布视口（Canvas Viewport）与单元格内联输入框（Inline Edit）在物理上是**强耦合**的：
1. **视口 -> 编辑器**：用户双击画布、或在选区按回车/敲键盘，画布视口捕获事件并呼叫编辑器：“在 $(r, c)$ 处打开输入框”；
2. **编辑器 -> 视口**：输入框要计算盖在哪个屏幕像素，必须读取视口的 `scrollX`、`scrollY`、`layout`，且编辑完成后必须调用视口的 `scheduleDraw` 触发重绘。

### 2. 强行拆分两个 Hook 导致的闭包黑魔法
由于原先将它们拆成了平级的两个 Hook（`useSheetCanvasView` 与 `useSheetInlineEdit`），在 Vue 的同步 setup 执行流中出现了死结：

```ts
// ❌ 历史反模式（Anti-Pattern）：
let inlineEdit: UseSheetInlineEditReturn | undefined // 1. 先声明空变量

// 2. 伪造一个满是 ?. 的桥接闭包，防止初始化时报 undefined
const editorBridge = {
  isEditing: () => inlineEdit?.editing.value ?? false,
  commitEdit: () => inlineEdit?.commitEdit(),
  openEditor: (r, c, initial) => inlineEdit?.openEditor(r, c, initial),
}

// 3. 先跑画布 Hook，吃进去桥对象
const { layout, scrollX, scrollY, scheduleDraw } = useSheetCanvasView({
  editor: editorBridge,
})

// 4. 再跑输入框 Hook，反写回第 1 步的空变量
inlineEdit = useSheetInlineEdit({ layout, scrollX, scrollY, onDraw: scheduleDraw })
```

#### 代价：
- **隐患极高**：只要生命周期中有任何初始化提前调用，立刻抛出 `TypeError: Cannot read property of undefined`；
- **心智负担重**：一个简单的双击编辑，在组件内涉及 4 个阶段的状态回环，代码极其晦涩。

---

## 三、 重构解决方案：单向内聚数据流

### 1. 明确“真复用”与“假复用”的边界
- **真复用 UI**：`<FormulaRichInput.vue>`（带公式语法高亮的输入框组件）
  - 既用于单元格双击浮动输入框（`SheetCanvas.vue`）；
  - 又用于顶部常驻公式输入栏（`SheetFormulaBar.vue`）。
  - 👉 **必须保留独立公共组件**。
- **假复用逻辑**：`useSheetInlineEdit`
  - 其内部算的全是当前这块特定 Canvas 上的行列物理坐标、滚动偏移与重绘；
  - 离开当前画布没有任何其他地方能够复用。
  - 👉 **必须收拢内聚到画布视口统一管辖**。

### 2. 单向流调用架构

消除平级依赖，将 `useSheetInlineEdit` 的创建与桥接直接**收敛到 `useSheetCanvasView` 内部**：

```mermaid
flowchart TD
    SheetCanvas["SheetCanvas.vue (视图组件)"] -->|传参调用 (单向顺流)| CanvasViewHook["useSheetCanvasView (唯一总控 Hook)"]
    
    subgraph InsideHook ["useSheetCanvasView 内部内聚闭环"]
        Inline["useSheetInlineEdit (内部状态机)"]
        Bridge["editorBridge (强绑定对象，无任何 ?.)"]
        Viewport["SheetViewport (视口总控实例)"]
        
        Inline --> Bridge
        Bridge --> Viewport
    end
    
    CanvasViewHook -->|导出视口状态| State1["scrollX, scrollY, layout, resizeGuide..."]
    CanvasViewHook -->|导出编辑状态| State2["editing, editorValue, editorStyle, onEditorInput..."]
```

### 3. 重构后 `SheetCanvas.vue` 的干净代码范式

```vue
<script setup lang="ts">
// 统一调用单个 Hook，零闭包、零可选链、单向顺流
const {
  // 视口与滚动
  scrollX, scrollY, layout, totalW, totalH,
  resizeGuide, rowMoveGuide, colMoveGuide,
  scrollbar, onCanvasWheel, onPointerMouseDown, onKeyDown,
  
  // 内联编辑与公式
  editing, editorValue, editorStyle, editorFieldStyle,
  onEditorInput, onEditorBlur, onEditorKeydown, syncEditorCaret,
  cancelEdit, commitEdit,
} = useSheetCanvasView({
  rootEl, canvasEl, viewportEl, scrollEl, editorEl,
  sheet, revision, editable: editableCpt, formulaEdit,
  // 业务回调
  onSelectRange, onCellClick, onContextMenu, onScrollLayout,
})

// defineExpose 直接安全暴露
defineExpose({
  commitEdit, // 直接可用，不再有 inlineEdit?.
  // ...
})
</script>
```

---

## 四、 后续开发准则（铁律）

1. **禁止在视图层重新拆解“视口”与“单元格编辑”**：
   单元格编辑物理上就是视口的一部分，所有编辑坐标与视口重绘一律在 `useSheetCanvasView` 内部闭环。
2. **禁止出现 `let xxx: HookReturn | undefined` 的闭包桥接**：
   如果两个模块需要彼此的数据，说明职责划分有误，应当采用**高内聚组合模式**，将依赖方置于同一生命周期作用域内。
3. **React 端（`@speed-sheet/react`）接入指引**：
   后续开发 React 视口 Hook 时，参照此模式：由单个 `useSheetViewport` 统一包装 `SheetViewport` 和内联编辑，不要在 React 组件层面拆分双 Hook。
