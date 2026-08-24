import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'

/**
 * Re-apply the "use client" directive.
 *
 * tsup's `banner` does not survive the bundle — the directive is hoisted away
 * and reported as ignored. Without it every RSC consumer has to wrap the import
 * in their own client boundary, so it is prepended here where nothing can strip
 * it again. It must be the very first statement in the file.
 */
const DIRECTIVE = '"use client";\n'

for (const file of ['dist/index.js', 'dist/index.cjs']) {
  const source = readFileSync(file, 'utf8')
  if (source.startsWith(DIRECTIVE)) continue
  writeFileSync(file, DIRECTIVE + source)
}

copyFileSync('src/styles.css', 'dist/styles.css')

console.log('postbuild: "use client" applied, styles.css copied')
