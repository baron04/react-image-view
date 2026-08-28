import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  // Tests live beside the code; they must never reach the bundle.
  ignoreWatch: ['**/*.test.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  // Off, not just excluded from `files`: with `sourcemap: true` the maps
  // were 71% of the published tarball's unpacked size — every install paid
  // that even though a browser only fetches a .map on demand, from
  // devtools, and only for someone stepping into this library specifically.
  // Turning generation off entirely (rather than building maps and dropping
  // them from `files`) avoids shipping a `sourceMappingURL` comment with
  // nothing on the other end of it.
  sourcemap: false,
  clean: true,
  treeshake: true,
  target: 'es2020',
  external: ['react', 'react-dom'],
  // The published bundle had been shipping full source — including every
  // multi-paragraph doc comment in src/core/tuning.ts — because tsup does
  // not minify by default. That was never a deliberate choice; every "N kB
  // gzipped" figure reported before this had comments baked into it.
  // Consumers only ever see the .d.ts for documentation, so there is nothing
  // lost by minifying the runtime code. Identifier minification only
  // touches internal bindings — exported names must still match the .d.ts,
  // so esbuild does not (and cannot) rename them.
  minify: true,
  // "use client" must survive bundling — RSC consumers depend on it
  banner: { js: '"use client";' },
})
