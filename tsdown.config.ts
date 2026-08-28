import { defineConfig } from 'tsdown'

const shared = {
  format: ['esm', 'cjs'],
  dts: true,
  // Every entry writes distinct filenames into the same directory. Cleaning
  // happens once in prebuild/predev so concurrent configs cannot erase one
  // another's output.
  clean: false,
  minify: true,
  platform: 'neutral',
  target: 'es2020',
  sourcemap: false,
  treeshake: true,
  report: true,
} as const

// One build per public entry keeps each downloaded entry self-contained.
// A single multi-entry build creates shared chunks and makes an `index` import
// download exports that are only needed by `/core` or `/primitives`.
export default defineConfig([
  {
    ...shared,
    name: 'main',
    entry: { index: 'src/index.ts' },
    outDir: 'dist',
    banner: '"use client";',
  },
  {
    ...shared,
    name: 'primitives',
    entry: { primitives: 'src/primitives.ts' },
    outDir: 'dist',
    banner: '"use client";',
  },
  {
    ...shared,
    name: 'imperative',
    entry: { imperative: 'src/imperative.ts' },
    outDir: 'dist',
    banner: '"use client";',
  },
  {
    ...shared,
    name: 'core',
    entry: { core: 'src/core/index.ts' },
    outDir: 'dist',
  },
  {
    ...shared,
    name: 'zh-CN',
    entry: { 'zh-CN': 'src/locales/zh-CN.ts' },
    outDir: 'dist/locales',
  },
])
