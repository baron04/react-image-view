import { readFileSync, writeFileSync } from 'node:fs'
import { transform } from 'lightningcss'

const css = transform({
  filename: 'styles.css',
  code: readFileSync('src/styles.css'),
  minify: true,
})

writeFileSync('dist/styles.css', css.code)
console.log('postbuild: styles.css minified')
