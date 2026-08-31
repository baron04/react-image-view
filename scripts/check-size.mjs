import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'

const rawEntries = [
  ['full entry', 'dist/index.js', 12_150],
  ['primitives entry', 'dist/primitives.js', 10_900],
  ['imperative entry', 'dist/imperative.js', 11_800],
  ['core entry', 'dist/core.js', 4_400],
  ['zh-CN locale', 'dist/locales/zh-CN.js', 400],
  ['preset CSS', 'dist/styles.css', 1_850],
]

const consumerEntries = [
  {
    name: 'consumer: ImageView',
    // Consumer rebundling adds a small wrapper over the raw full entry. Keep
    // that allowance narrow, tracking the raw entry's ceiling above.
    budget: 12_200,
    source: `
      import * as React from 'react'
      import { ImageView } from 'react-img-view'
      export function Preview({ src }) {
        return <ImageView src={src} alt=""><button type="button">open</button></ImageView>
      }
    `,
  },
  {
    name: 'consumer: primitives',
    // Rebundling adds a little wrapper overhead versus the raw primitives
    // entry, so keep both views under the same ceiling.
    //
    // This does not shrink when the fixture imports four parts by name. Both
    // entries attach every part to `ImageView` as a static, and `tsdown`
    // strips the `/* @__PURE__ */` annotation that would let a downstream
    // bundler drop the unused namespace object — so the parts stay reachable.
    // Roughly 130 bytes, which is what one import idiom across both entries
    // costs; recovering it means giving up `ImageView.Group`.
    budget: 10_950,
    source: `
      import * as React from 'react'
      import { Group, Content, Stage, Image } from 'react-img-view/primitives'
      export function Preview({ src }) {
        return <Group images={[{ src }]} defaultOpen><Content><Stage><Image /></Stage></Content></Group>
      }
    `,
  },
  {
    name: 'consumer: imperative',
    // Was 12_000, which happened to be the exact measured size — a budget with
    // no headroom is a tripwire, not a budget, and any ten-byte change trips
    // it. Held a little above the real figure so it still catches something
    // growing rather than something moving.
    budget: 12_100,
    source: `
      import { ImagePreview } from 'react-img-view/imperative'
      export function Preview({ images }) {
        return <button onClick={() => ImagePreview.open({ images })}>open</button>
      }
    `,
  },
  {
    name: 'consumer: one core function',
    budget: 500,
    source: `
      import { fitScale } from 'react-img-view/core'
      export const fit = fitScale
    `,
  },
]

let failed = false

function report(name, bytes, budget) {
  const ok = bytes <= budget
  failed ||= !ok
  console.log(
    `${ok ? '✓' : '✗'} ${name}: ${(bytes / 1024).toFixed(2)} kB gzip (budget ${(budget / 1024).toFixed(2)} kB)`,
  )
}

for (const [name, file, budget] of rawEntries) {
  report(name, gzipSync(readFileSync(file)).byteLength, budget)
}

for (const entry of consumerEntries) {
  const result = await build({
    stdin: {
      contents: entry.source,
      loader: 'tsx',
      resolveDir: process.cwd(),
      sourcefile: `${entry.name}.tsx`,
    },
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    // Pin what a production application actually compiles to, rather than
    // depending on the bundler's default for an undefined NODE_ENV. These
    // fixtures exist to measure what someone downloads, and nobody downloads
    // the development-only branches (the misplaced-prop warning in
    // `ImageView`, for one).
    define: { 'process.env.NODE_ENV': '"production"' },
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    treeShaking: true,
    write: false,
  })
  const output = result.outputFiles?.[0]?.contents
  if (!output) throw new Error(`No bundle emitted for ${entry.name}`)
  report(entry.name, gzipSync(output).byteLength, entry.budget)
}

if (failed) process.exitCode = 1
