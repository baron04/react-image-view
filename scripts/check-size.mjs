import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'

const rawEntries = [
  ['full entry', 'dist/index.js', 12_000],
  ['primitives entry', 'dist/primitives.js', 10_750],
  ['imperative entry', 'dist/imperative.js', 11_800],
  ['core entry', 'dist/core.js', 4_400],
  ['zh-CN locale', 'dist/locales/zh-CN.js', 400],
  ['preset CSS', 'dist/styles.css', 1_850],
]

const consumerEntries = [
  {
    name: 'consumer: ImageView',
    budget: 12_000,
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
    budget: 10_750,
    source: `
      import * as React from 'react'
      import { Root, Content, Stage, Image } from 'react-img-view/primitives'
      export function Preview({ src }) {
        return <Root images={[{ src }]} defaultOpen><Content><Stage><Image /></Stage></Content></Root>
      }
    `,
  },
  {
    name: 'consumer: imperative',
    budget: 12_000,
    source: `
      import * as React from 'react'
      import { ImagePreviewProvider, useImagePreview } from 'react-img-view/imperative'
      function Open({ images }) {
        const preview = useImagePreview()
        return <button onClick={() => preview.open({ images })}>open</button>
      }
      export function Preview({ images }) {
        return <ImagePreviewProvider><Open images={images} /></ImagePreviewProvider>
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
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    treeShaking: true,
    write: false,
  })
  const output = result.outputFiles?.[0]?.contents
  if (!output) throw new Error(`No bundle emitted for ${entry.name}`)
  report(entry.name, gzipSync(output).byteLength, entry.budget)
}

if (failed) process.exitCode = 1
