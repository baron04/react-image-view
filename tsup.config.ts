import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  // Tests live beside the code; they must never reach the bundle.
  ignoreWatch: ['**/*.test.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2020',
  external: ['react', 'react-dom'],
  // "use client" must survive bundling — RSC consumers depend on it
  banner: { js: '"use client";' },
})
