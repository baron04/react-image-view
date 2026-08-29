// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'

// GitHub Pages serves a project site at /<repo>/, not the domain root. `site`
// is the full origin (needed for the sitemap and canonical URLs); `base` is
// the path prefix Astro rewrites every internal link, asset reference, and
// `astro:assets` output against automatically.
//
// Conditional on an env var, not always-on, so a plain local `astro
// dev`/`astro build` still resolves from `/` — only CI's GitHub Pages build
// needs the prefix.
const onGithubPages = process.env.GITHUB_PAGES === 'true'

// https://astro.build/config
export default defineConfig({
  site: 'https://baron04.github.io',
  base: onGithubPages ? '/react-img-view/' : '/',
  integrations: [
    react(),
    starlight({
      title: 'react-img-view',
      customCss: ['./src/styles/custom.css'],
      description:
        'Headless-first, composable React image viewer with an optional preset: zoom, pan, pinch, rotate, fit-to-window and 1:1.',
      // English is the default and lives at the root; Chinese is served
      // from /zh. Starlight resolves the pair itself, so a page with no
      // translation falls back to English rather than 404ing.
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        zh: { label: '简体中文', lang: 'zh-CN' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/baron04/react-img-view' },
      ],
      // `translations` on each entry is what keeps the sidebar from
      // staying English on the Chinese pages — Starlight only localises
      // labels it is given translations for.
      sidebar: [
        { label: 'Overview', slug: 'index', translations: { 'zh-CN': '概览' } },
        { label: 'Installation', slug: 'installation', translations: { 'zh-CN': '安装' } },
        { label: 'Quick Start', slug: 'quick-start', translations: { 'zh-CN': '快速开始' } },
        { label: 'Customization', slug: 'customization', translations: { 'zh-CN': '自定义' } },
        { label: 'API Reference', slug: 'api-reference', translations: { 'zh-CN': 'API 文档' } },
        {
          label: 'Design & Registry',
          slug: 'design-and-registry',
          translations: { 'zh-CN': '设计与 Registry' },
        },
      ],
    }),
  ],
})
