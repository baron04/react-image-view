import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve('docs-site/dist')
const files = []

function collect(path) {
  if (statSync(path).isDirectory()) {
    for (const child of readdirSync(path)) collect(resolve(path, child))
    return
  }
  if (path.endsWith('.html')) files.push(path)
}

if (!existsSync(root)) {
  console.error('docs:html-check — docs-site/dist does not exist')
  process.exit(1)
}

collect(root)

const failures = []
for (const file of files) {
  const html = readFileSync(file, 'utf8')
  if (/<p(?:\s[^>]*)?>\s*<p(?:\s|>)/i.test(html)) {
    failures.push(`${file}: nested <p> generated from MDX`)
  }
  if (/<a(?:\s[^>]*)?>\s*<p(?:\s|>)/i.test(html)) {
    failures.push(`${file}: paragraph generated inside a link`)
  }
  if (
    process.env.GITHUB_PAGES === 'true' &&
    /<link rel="canonical" href="https:\/\/baron04\.github\.io\/(?!react-img-view\/)/.test(html)
  ) {
    failures.push(`${file}: production canonical URL is missing /react-img-view/`)
  }
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(`docs:html-check — ${files.length} generated pages passed`)
}
