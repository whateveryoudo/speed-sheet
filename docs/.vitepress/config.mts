import { defineConfig } from 'vitepress'

const base = process.env.NODE_ENV === 'production' ? '/speed-sheet/docs/' : '/'

export default defineConfig({
  title: 'Speed Sheet',
  description: '现代版高性能在线电子表格引擎 · Luckysheet 深度兼容 · Yjs 多人协同',
  base,
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
      { text: 'Luckysheet 迁移', link: '/guide/migration' },
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
            { text: 'Luckysheet 迁移指南', link: '/guide/migration' },
          ],
        },
      ],
      '/config/': [
        {
          text: '核心配置与 API',
          items: [
            { text: '组件 Props 全景', link: '/config/props' },
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
