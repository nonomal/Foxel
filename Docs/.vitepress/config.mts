import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Foxel",
  description: "光影如诗，一眼千寻。",
  themeConfig: {
    editLink: {
      text: '在 GitHub 上编辑此页',
      pattern: 'https://github.com/DrizzleTime/Foxel/edit/master/Docs/:path'
    },
    nav: [
      { text: '指南', link: '/guide/what-is-foxel' },
    ],

    sidebar: [
      {
        text: '指南',
        items: [
          { text: '什么是 Foxel', link: '/guide/what-is-foxel' },
          { text: '快速上手', link: '/guide/getting-started' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/DrizzleTime/Foxel' }
    ]
  }
})
