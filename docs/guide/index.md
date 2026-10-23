# 基本介绍

**Speed Sheet** 是一款面向现代化 Web 应用的高性能在线电子表格引擎。

它吸收了经典开源项目 [Luckysheet](https://github.com/dream-num/Luckysheet) 的优秀数据模型，并在底层基于 **Canvas 视口渲染**、**Yjs CRDT 协同** 与 **TipTap 风格命令扩展** 进行了完全重构。

---

## 解决的核心痛点

1. **老版 Luckysheet 停更与维护难**：
   * 原版 Luckysheet 已官方声明停止维护；老版强依赖 jQuery、缺乏现代框架单例规范、DOM 结构重。
   * **Speed Sheet 解法**：完全解耦的 Headless 核心架构，基于 Vue 3 + Ant Design Vue 现代技术栈，同时**原生保持对 Luckysheet 数据的双向兼容**，老项目零成本平迁！

2. **多人协同门槛高**：
   * 传统表格需要自己写长轮询或差量 Patch 算法，容易丢数据或冲突。
   * **Speed Sheet 解法**：底层基于成熟的 Yjs (CRDT) 体系，所有写入统一经过事务驱动，开箱天然具备无锁多人并发协作能力。

3. **组件过度拆包与业务繁重**：
   * 不像部分竞品按单机版/协同版拆成七八个包导致业务写两套代码。
   * **Speed Sheet 解法**：统一收敛为一个 `<SpeedSheet />` 组件，单机、协同、纯只读查看仅靠一个参数切换。

---

## 核心技术栈

* **渲染层**：纯 Canvas 高性能视口按需重绘
* **协同层**：Yjs / Hocuspocus CRDT
* **公式引擎**：基于 `@formulajs/formulajs` 的常用函数支持（SUM、IF、VLOOKUP 等）
* **UI 层**：Ant Design Vue 规范适配
