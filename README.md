# react-img-view

[简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/react-img-view.svg)](https://www.npmjs.com/package/react-img-view)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/react-img-view)](https://bundlephobia.com/package/react-img-view)
[![license](https://img.shields.io/npm/l/react-img-view.svg)](LICENSE)

A headless-first, composable **React image viewer** / image preview / lightbox
with an optional polished preset — built for reviewing document attachments
and admin image fields, not photo galleries. Zoom, pan, pinch, rotate,
fit-to-window and 1:1, keyboard shortcuts, and touch gestures, with every
visible part replaceable.

**[Documentation](https://baron04.github.io/react-img-view/)** ·
[Quick Start](https://baron04.github.io/react-img-view/quick-start/) ·
[API Reference](https://baron04.github.io/react-img-view/api-reference/)

```bash
npm install react-img-view
```

```tsx
import { ImageView } from 'react-img-view'
import 'react-img-view/styles.css'

function AttachmentPreview({ file }) {
  return (
    <ImageView src={file.full} alt={file.name}>
      <img src={file.thumb} alt={file.name} />
    </ImageView>
  )
}
```

One line for a single image, one component for a shared gallery, full
composition when you need it — see the
[docs](https://baron04.github.io/react-img-view/quick-start/) for all
three.

For a true function call, import `ImagePreview` from
`react-img-view/imperative` and call `ImagePreview.open({ images, index })`.
No Provider is required; closing automatically removes the temporary host.

The main entry is **11.6 kB gzip**. For custom chrome, import headless parts
from `react-img-view/primitives` (**10.4 kB gzip**); low-level transforms and
the gesture state machine live at `react-img-view/core` and tree-shake down
to about **0.5 kB** when one helper is used. The minified CSS preset is
**1.7 kB gzip**. CI enforces these budgets.

English labels are deterministic by default. Choose another language
explicitly so server and hydrated markup always agree:

```tsx
import zhCN from 'react-img-view/locales/zh-CN'

function ChineseViewer({ files }) {
  return <ImageView.Root images={files} labels={zhCN} />
}
```

![Zoom, rotate, fit, and page through attachments](media/demo.gif)

## Why

Most React image viewers are built for browsing — fading chrome, autoplay,
swipe-anything-to-dismiss. Reviewing a document attachment is a different
job: the toolbar stays visible, there's a dedicated **1:1** control, pinch
zoom hands off to the next slide mid-gesture instead of stuttering, and
swipe-to-dismiss only responds to touch so a mouse drag never closes the
viewer by accident. The reasoning behind every default is written up in
[Design & Registry](https://baron04.github.io/react-img-view/design-and-registry/).

## Two ways to get the look

A CSS preset (`react-img-view/styles.css`, works anywhere) or a
Tailwind-classed [shadcn registry block](registry/) you install as real,
editable source — same design, same tokens, your choice of distribution.

## Known limitation

Every gesture constant — how far a pan has to overshoot before it hands off
to the pager, how hard a flick decays, the trackpad pinch rate — lives in
[`src/core/tuning.ts`](src/core/tuning.ts). It's been exercised hard in
simulation (replayed pointer-event sequences in unit tests, synthetic
touch/pinch dispatched through a real browser, mobile-width and
touch-emulated viewports) and has now had one real-device pass on an actual
phone, with no issues reported — pinch, pan-to-page handoff, and
pull-to-dismiss all felt right. That's one device, not a matrix; latency,
screen size, and finger friction vary enough across hardware that this is
still worth trying on whatever you're carrying. If a gesture feels wrong,
`tuning.ts` is the one file to open — a PR changing a number there, with
what device it was felt on, is exactly the kind of contribution this needs.

## Contributing

Dev setup, repo layout, and the release process are in
[CONTRIBUTING.md](CONTRIBUTING.md) — including two testing rules this
codebase learned the hard way, both from bugs that reached npm.

Release history is in [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).
