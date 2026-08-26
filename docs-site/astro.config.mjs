// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

// GitHub Pages serves a project site at /<repo>/, not the domain root. `site`
// is the full origin (needed for the sitemap and canonical URLs); `base` is
// the path prefix Astro rewrites every internal link, asset reference, and
// `astro:assets` output against automatically.
//
// Conditional on an env var, not always-on, so a plain local `astro
// dev`/`astro build` still resolves from `/` — only CI's GitHub Pages build
// needs the prefix.
const onGithubPages = process.env.GITHUB_PAGES === 'true';

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
				'React image viewer and lightbox component: zoom, pan, pinch, rotate, fit-to-window and 1:1. Headless and composable, built for previewing document attachments and admin image fields.',
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
			sidebar: [
				{ label: 'Overview', slug: 'index' },
				{ label: 'Installation', slug: 'installation' },
				{ label: 'Quick Start', slug: 'quick-start' },
				{ label: 'Customization', slug: 'customization' },
				{ label: 'API Reference', slug: 'api-reference' },
				{ label: 'Design & Registry', slug: 'design-and-registry' },
			],
		}),
	],
});
