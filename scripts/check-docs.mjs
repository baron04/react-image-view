import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'

const roots = ['README.md', 'README.zh-CN.md', 'docs', 'docs-site/src/content/docs']
const files = []

function collect(path) {
  if (!existsSync(path)) return
  if (statSync(path).isDirectory()) {
    for (const child of readdirSync(path)) collect(resolve(path, child))
    return
  }
  if (/\.(md|mdx)$/.test(path)) files.push(resolve(path))
}

for (const root of roots) collect(root)

const forbidden = [
  [/<ImageView\.Trigger\s+asChild\b/, '`Trigger` does not accept `asChild`'],
  [/Every part takes `asChild`/i, 'only controls and layout regions take `asChild`'],
  [/每个部件都支持 `asChild`/, '只有控件和布局区域支持 `asChild`'],
  [
    /^\s*;<[A-Z]/m,
    'wrap standalone JSX examples in a component instead of using a leading semicolon',
  ],
  [
    /ImagePreviewProvider|useImagePreview/,
    'the function API is ImagePreview.open(), not the removed Provider/Hook API',
  ],
  [
    /no Provider|不需要 Provider/i,
    'describe ImagePreview.open() directly without Provider caveats',
  ],
  [
    /附件|attachments?/i,
    'position react-img-view as a general image preview, not an attachment-specific tool',
  ],
  [
    /pulled from the same types\.ts|与使用者引入的 types\.ts 同源/,
    'API reference is maintained and checked, not generated from types.ts',
  ],
  [/不渲染对应的部件就行/, 'Stage gestures cannot be disabled by omitting a visual part'],
]

const failures = []

for (const file of files) {
  const source = readFileSync(file, 'utf8')

  for (const [pattern, message] of forbidden) {
    if (pattern.test(source)) failures.push(`${file}: ${message}`)
  }

  for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '')
    if (/^(?:https?:|mailto:|#)/.test(rawTarget)) continue

    const target = rawTarget.split('#')[0].split('?')[0]
    if (!target) continue

    const absolute = resolve(dirname(file), target)
    // Starlight links are written relative to the rendered route. A sibling
    // route uses `../sibling/`, although its source file sits in the same
    // content directory. Check both filesystem and route-style resolutions.
    const routeStyle = resolve(dirname(file), target.replace(/^(\.\.\/)+/, ''))
    const bases = [...new Set([absolute, routeStyle])]
    const candidates = [...bases]
    for (const base of bases) {
      if (extname(base)) continue
      candidates.push(`${base}.md`, `${base}.mdx`, resolve(base, 'index.md'))
      candidates.push(resolve(base, 'index.mdx'))
    }

    if (!candidates.some(existsSync)) failures.push(`${file}: broken local link ${rawTarget}`)
  }
}

for (const assetSource of [
  'docs-site/src/components/Demo.tsx',
  'docs-site/src/styles/custom.css',
]) {
  const source = readFileSync(assetSource, 'utf8')
  if (/picsum\.photos|fonts\.googleapis\.com/.test(source)) {
    failures.push(`${resolve(assetSource)}: documentation assets must be self-hosted`)
  }
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(`docs:check — ${files.length} files, factual guards and local links passed`)
}
