# shadcn registry

The Tailwind-styled counterpart to the package's shipped `styles.css` preset
— same design, same tokens, but as source you install into your own repo and
edit directly, per the architecture decision to give both a CSS-variable
preset (works anywhere) and a copy-paste Tailwind block (for shadcn projects).

- `image-view/image-view.tsx` — the block. Behaviour (gestures, the modal,
  keyboard, FLIP) comes from the `react-img-view` package as a real
  dependency; only presentation is copied in, matching how shadcn's own
  blocks wrap Radix primitives.
- `../registry.json` — the manifest `shadcn build` reads to produce the
  served JSON.

## Building

```bash
pnpm registry:build
```

Writes `docs-site/public/r/image-view.json` and `.../registry.json`
directly into the docs site's static assets — that's a real, committed
destination now, not a gitignored scratch output: Astro copies `public/`
verbatim into `dist/` at build time, so these files are served at
exactly the URL below once the site deploys. Re-run this after any change
to `image-view.tsx` or the `cssVars` in `registry.json`; nothing does it
automatically.

## Installing

```bash
npx shadcn@latest add https://baron04.github.io/react-img-view/r/image-view.json
```

## Keeping this in sync with styles.css

Both files encode the same design tokens as two different mechanisms (CSS
custom properties vs. a shadcn `cssVars` block feeding Tailwind arbitrary
values). A palette or spacing change belongs in three places: the design
canvas, `src/styles.css`, and this file's `image-view.tsx` + the `cssVars`
in `registry.json`. There is no single source of truth here by construction
— see the decisions doc's note on why both distribution forms were kept
despite the cost.
