# Vue 3 事件机制与浮层组件（Tooltip / Dropdown）嵌套避坑指南

> **适用场景**：封装业务组件库、处理按钮工具栏交互、解决 Tooltip 与 Dropdown 遮挡冲突、理解 Vue 3 事件绑定与虚拟 DOM（VNode）操作。
> **目标**：不用复杂学术黑话，用大白话彻底讲清 Vue 3 事件合并、传送门机制以及浮层嵌套的核心逻辑。

---

## 一、为什么我们手写 `onClick` 会把子节点原本的事件“盖掉”？

### 1. 经典翻车现场：普通对象合并 vs 真正的事件合并

假设你在写一个包装组件（比如给按钮加气泡、加防抖、加权限检查），想给子节点悄悄塞一个 `onClick`：

```ts
// ❌ 翻车写法：直接覆盖 props
cloneVNode(vnode, {
  onClick: handleClick
})
```

**为什么会出事？**
在 JavaScript 里，`{ onClick: fn1, onClick: fn2 }` 就是一个普通对象的属性赋值！
后写的 `fn2` 会**无情地把子节点原有的 `props.onClick` 给彻底覆盖**。
结果就是：你的功能生效了，但子节点原本的业务点击（比如打开下拉、提交表单）彻底哑火了！

---

### 2. 正确解法：Vue 官方核心工具 `mergeProps`

Vue 3 官方提供了一个专门用来“安全合并属性”的底层 API：**`mergeProps`**。

```ts
import { cloneVNode, mergeProps } from 'vue'

// ✅ 正确写法：使用 mergeProps 链式合并
const mergedProps = mergeProps(vnode.props || {}, {
  onClick: handleClick,
  onMouseleave: handleMouseLeave
})

return cloneVNode(vnode, mergedProps)
```

#### 为什么 `mergeProps` 不会覆盖？
当你把两个带有同名事件的对象交给 `mergeProps` 时：
```ts
mergeProps(
  { onClick: originalClick }, 
  { onClick: myClick }
)
```
Vue 内部会把它变成一个**函数数组**：
`onClick: [originalClick, myClick]`

用户在页面点击按钮时：
1. **先执行**子节点原本的 `originalClick(event)`（参数 `$event` 完整传递）；
2. **紧接着执行**你的 `myClick(event)`；
3. 原生业务 100% 正常运行，谁也不会被覆盖，互不干扰！

---

## 二、浏览器原生 DOM 事件 vs Vue 组件事件（大白话区分）

很多时候感觉“事件神出鬼没”，是因为混淆了**原生事件**和**Vue组件事件**：

### 1. 原生 DOM 事件（有“冒泡”特性）
- 像你在原生 `<button>`、`<div>`、`<span>` 上的 `click`、`mousemove` 等；
- **核心特点**：**水里的泡泡往上冒**。
  你点击了按钮内部的一个图标 `<svg>`，这个点击事件会自动向外传递：
  `svg -> span -> button -> 父级 div -> body`。
- 所以只要在外层监听 `click`，里面无论有多少层、无论点了谁，都能收到事件。

### 2. Vue 组件自定义事件（无冒泡，纯回调）
- 比如 `<my-dialog @close="onClose">` 里的 `close`；
- 它本质上**只是父组件传给子组件的一个函数指针（回调）**，子组件调用 `emit('close')` 时它才执行，**根本不会向外层 DOM 冒泡**。

---

## 三、Dropdown 与 Tooltip 到底应该“谁包谁”？

在工具栏开发中，一个按钮往往既有 **悬浮快捷键提示（Tooltip）**，又有 **点击弹出下拉菜单（Dropdown）**。

### 结论先行：永远遵循 **“Dropdown 在外，Tooltip 在内（紧贴按钮）”**

```html
<!-- ✅ 100 分标准规范（各大 UI 库统一规范） -->
<a-dropdown>
  <!-- Tooltip 只贴身包裹那个具体的触发按钮 -->
  <s-keymap-tip title="数字格式 (Ctrl+Shift+1)">
    <a-button>常规 <CaretDownOutlined /></a-button>
  </s-keymap-tip>

  <template #overlay>
    <a-menu>
      <a-menu-item>常规</a-menu-item>
      <a-menu-item>货币</a-menu-item>
    </a-menu>
  </template>
</a-dropdown>
```

---

## 四、为什么反过来写（`Tip 包 Dropdown`）会有大坑？

如果写成：
```html
<!-- ⚠️ 危险写法：Tip 跑到了最外层 -->
<s-keymap-tip title="提示">
  <a-dropdown>
    <a-button>常规</a-button>
    <template #overlay>...</template>
  </a-dropdown>
</s-keymap-tip>
```

在实际开发中会遇到 3 个经典大坑：

### 1. 传送门（Teleport）与“事件穿透丢失”
- **什么是传送门？**
  `<a-dropdown>` 的弹出菜单为了不被工具栏的边框切掉，底层使用了 Vue 3 的 `<Teleport to="body">`，直接把菜单**瞬移**到了 `document.body` 最底下。
- **为什么事件会丢失？**
  `<a-dropdown>` 是一个复合组件（内部既有留在原地的按钮，又有被传送走的弹层），属于 Vue 3 的 **Fragment（多根节点）**。
  当你把外层 Tooltip 套在 `<a-dropdown>` 外面、试图给它注入 `onClick` 时，Vue 根本不知道要把这个 `onClick` 挂在按钮上还是挂在传送门上。
  结果 Vue 会抛出警告并将属性丢弃（**事件透传失败**），导致点击按钮时外层 Tooltip 根本收不到点击事件，死活关不掉！

### 2. 下拉面板内操作时，快捷键气泡“死灰复燃”
在某些全屏或独立容器中，Dropdown 会配置 `:getPopupContainer`（让弹层挂在当前组件内）。
如果 Tip 在最外层：
- 只要用户鼠标移入下拉菜单选东西，事件又冒泡到了最外层的 Tip；
- **结果**：你正在专心挑菜单选项，头顶上突然“唰”地弹出一个黑色的快捷键气泡，死死挡住了菜单的第一行！

### 3. DOM 尺寸测量跑偏
Tooltip 决定弹出在屏幕哪个坐标，依靠的是调用 `getBoundingClientRect()` 测量子节点大小：
- **正确写法**：Tip 测量的就是 32px 的按钮，气泡精准停在按钮下方；
- **错误写法**：Tip 测量的可能是展开后的“按钮 + 整个下拉面板”（比如 300px 高），气泡直接飞到了屏幕底部的奇怪空旷位置。

---

## 五、经典补充技巧：按钮被禁用（`disabled`）时怎么让 Tooltip 出来？

原生浏览器有一个硬性规定：**被禁用的 `<button disabled>` 标签，绝不触发任何鼠标事件（点击、移动、Hover 统统失效）！**

如果你希望“按钮虽然禁用了，但鼠标移上去依然能告诉用户为什么不能点”：

```html
<!-- 💡 巧妙解法：在 button 外层包一个 span，让 span 充当事件接收器 -->
<a-dropdown :disabled="true">
  <s-keymap-tip title="当前单元格已锁定，无编辑权限">
    <span class="inline-block cursor-not-allowed">
      <a-button :disabled="true" style="pointer-events: none;">常规</a-button>
    </span>
  </s-keymap-tip>
</a-dropdown>
```
- 给 button 加上 `pointer-events: none;`；
- 外层的 `span` 依然是正常激活的 DOM，能够 100% 触发 mouseenter，气泡完美浮现！

---

## 六、速查记忆口诀

1. **合并事件别手写，官方 `mergeProps` 准没错。**
2. **大容器（Dropdown）在外部，小贴纸（Tooltip）在里头。**
3. **Tip 贴身穿在 Button 上，下拉菜单跑不了。**
4. **组件套多报错漏，传送门前莫乱透。**
