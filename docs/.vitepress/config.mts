import { defineConfig } from 'vitepress'

const base = process.env.NODE_ENV === 'production' ? '/speed-sheet/docs/' : '/'

export default defineConfig({
  title: 'Speed Sheet',
  description: '现代版轻量协同电子表格引擎 · 兼容 Luckysheet 数据结构 · Yjs 原生多人协同 · 自研 Canvas 视口调度',
  base,
  sitemap: {
    hostname: 'https://whateveryoudo.github.io/speed-sheet/docs/',
  },
  head: [
    ['meta', { name: 'keywords', content: 'speed-sheet, 在线表格, 电子表格, luckysheet, spreadsheet, canvas, yjs, crdt, vue3, 在线excel, 协同表格, web excel' }],
    ['meta', { name: 'author', content: 'Speed Platform' }],
    ['meta', { property: 'og:title', content: 'Speed Sheet - 现代版轻量协同电子表格引擎' }],
    ['meta', { property: 'og:description', content: '基于 Yjs CRDT + 自研 Canvas 视口调度，兼容常见 Luckysheet 数据结构的高性能轻量协同表格。' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://whateveryoudo.github.io/speed-sheet/docs/' }],
  ],
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
      { text: '配置与 API', link: '/config/props' },
      { text: '协同指南', link: '/collaboration/' },
      { text: '扩展插件', link: '/extensions/' },
      { text: '在线 Demo 🚀', link: 'https://whateveryoudo.github.io/speed-sheet/demo/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '基础指南',
          items: [
            { text: '基本介绍', link: '/guide/' },
            { text: '快速开始', link: '/guide/quickstart' },
          ],
        },
      ],
      '/config/': [
        {
          text: '核心配置与 API',
          items: [
            { text: '组件 Props 全景', link: '/config/props' },
            { text: '组件 Ref 与 API 实例', link: '/config/api-ref' },
            { text: '单元格数据结构', link: '/config/cell-data' },
            { text: '工具栏定制 (Toolbar)', link: '/config/toolbar' },
            { text: '插入菜单定制 (Insert)', link: '/config/insert' },
            { text: '右键菜单定制 (Context)', link: '/config/context-menu' },
          ],
        },
      ],
      '/collaboration/': [
        {
          text: '协同编辑',
          items: [
            { text: '单人 vs 多人协同', link: '/collaboration/' },
          ],
        },
      ],
      '/extensions/': [
        {
          text: '扩展体系',
          items: [
            { text: '扩展插件概述与开发', link: '/extensions/' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/whateveryoudo/speed-sheet' },
    ],
  },
})
