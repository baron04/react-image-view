// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

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
		starlight({
			title: 'react-img-view',
			customCss: ['./src/styles/custom.css'],
			description:
				'A composable, headless image viewer for React — built for reviewing document attachments and admin image fields, not photo galleries.',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/baron04/react-img-view' },
			],
			sidebar: [
				{ label: 'Overview', slug: 'index' },
				{ label: 'Installation', slug: 'installation' },
				{ label: 'Quick Start', slug: 'quick-start' },
				{ label: 'API Reference', slug: 'api-reference' },
				{ label: 'Design & Registry', slug: 'design-and-registry' },
			],
		}),
	],
});
