---
layout: home

hero:
  name: Speed Sheet
  text: 现代版轻量协同电子表格引擎
  tagline: Yjs 原生多人协同 · 自研 Canvas 视口 · 兼容常见表格数据格式
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quickstart
    - theme: alt
      text: 配置与 API
      link: /config/props
    - theme: alt
      text: 在线试玩 Demo 🚀
      link: https://whateveryoudo.github.io/speed-sheet/demo/

features:
  - icon: 🤝
    title: 协同与单机仅一参之差
    details: 统一入口组件，传入 ydoc 即走 Yjs 原生多人在线协同，不传即为极速单机/纯查看态。
  - icon: 🔄
    title: 数据兼容中转
    details: 底层摒弃老旧臃肿架构，采用现代 CRDT 数据模型；同时提供 Luckysheet 常见数据格式的无损导入导出。
  - icon: 🎨
    title: Ant Design 原生美学
    details: 工具栏、公式编辑栏、多工作表页签栏深度融入 Ant Design Vue 规范，开箱即美观。
  - icon: ⚡
    title: 高性能 Canvas 视口渲染
    details: 视口按需绘制与网格事件调度彻底分离，大表格浏览与单元格编辑交互流畅。
  - icon: 🧩
    title: TipTap 风格 Extension 扩展
    details: 链式命令调用 sheet.chain().run()，支持向表格定制注册水印、快捷键与渲染扩展。
  - icon: 🌐
    title: 协同文档生态组成
    details: 专为轻量嵌入设计，支持配合知识库、协同办公与看板系统，提供可靠的在线表格能力。
