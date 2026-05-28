# `@speed-sheet/core` 源码

Headless 电子表格引擎（无 DOM / 无框架依赖），对标 TipTap 的 Editor + Extension 架构。

## 目录

| 目录 | 说明 |
|------|------|
| [`state/`](./state/) | Yjs 文档上的表格状态读写（单元格、选区、行列 order） |
| [`renderer/`](./renderer/) | Canvas 布局、网格度量、命中检测、绘制 |
| [`interaction/`](./interaction/) | 指针/键盘交互状态机（与 Vue/React 解耦） |
| [`extension/`](./extension/) | Extension 插件体系与内置命令 |
| [`commands/`](./commands/) | `chain()` 命令调度 |
| [`yjs/`](./yjs/) | UndoManager、transact 边界、origin 标记 |
| [`adapter/`](./adapter/) | Luckysheet ↔ v2 快照互转 |
| [`api/`](./api/) | Luckysheet 风格兼容 API |
| [`formula/`](./formula/) | 公式引擎占位（实现在 `@speed-sheet/extension-formula`） |
| [`__tests__/`](./__tests__/) | 单元测试 |

## 入口

- 对外导出：[`index.ts`](./index.ts)
- 主类：[`Sheet.ts`](./Sheet.ts)

## 分层原则

- **core**：数据语义 + 无 UI 交互 + 渲染数学
- **vue3 / react**：DOM 事件、预览 overlay、内联编辑器
