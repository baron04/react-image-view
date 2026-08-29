# react-img-view

[简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/react-img-view.svg)](https://www.npmjs.com/package/react-img-view)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/react-img-view)](https://bundlephobia.com/package/react-img-view)
[![license](https://img.shields.io/npm/l/react-img-view.svg)](LICENSE)

A **React image viewer** that works out of the box without locking you into its UI.

react-img-view keeps gestures, animation, and state management inside the library while exposing the interface as composable headless parts. Start with the polished preset, then replace buttons, images, or the entire layout without reimplementing zoom and gesture handling.

- **Complete interactions:** zoom, pan, pinch, rotate, fit-to-window, 1:1, keyboard shortcuts, and touch gestures.
- **Headless and composable:** `Root`, `Content`, `Stage`, `Image`, and every control can be composed directly.
- **Flexible integration:** single image, shared viewer, controlled state, or the function-style API.

**[Documentation](https://baron04.github.io/react-img-view/)** · [Quick Start](https://baron04.github.io/react-img-view/quick-start/) · [API Reference](https://baron04.github.io/react-img-view/api-reference/)

```bash
npm install react-img-view
```

```tsx
import { ImageView } from 'react-img-view'
import 'react-img-view/styles.css'

function ImagePreviewExample({ image }) {
  return (
    <ImageView src={image.full} alt={image.name}>
      <img src={image.thumb} alt={image.name} />
    </ImageView>
  )
}
```

Use one line for a single image, share one viewer across a set, and expand into full composition only when needed. See the [Quick Start](https://baron04.github.io/react-img-view/quick-start/) for each form.

For function-style use, import `ImagePreview` from `react-img-view/imperative` and call `ImagePreview.open({ images, index })`. The viewer cleans itself up after closing.

The main entry is **11.6 kB gzip**. For custom chrome, import headless parts from `react-img-view/primitives` (**10.4 kB gzip**); low-level transforms and the gesture state machine live at `react-img-view/core` and tree-shake down to about **0.5 kB** when one helper is used. The minified CSS preset is **1.7 kB gzip**. CI enforces these budgets.

English labels are deterministic by default. Choose another language explicitly so server and hydrated markup always agree:

```tsx
import zhCN from 'react-img-view/locales/zh-CN'

function ChineseViewer({ images }) {
  return <ImageView.Root images={images} labels={zhCN} />
}
```

![Zoom, rotate, fit, and page through images](media/demo.gif)

## Why

The hard part of an image viewer is rarely adding zoom. It is keeping the viewer adaptable when the toolbar moves, controls must use an existing design system, the image needs application-specific behavior, or the whole layout changes. A monolithic component tends to answer each request with another prop or another CSS override.

react-img-view separates behavior from presentation. The library owns zoom, gestures, animation, keyboard input, focus, and loading state; the application owns what gets rendered. Even the preset is assembled from the same public parts, so the one-line API and a fully custom UI share one implementation.

## Choose your UI layer

- **Built-in preset:** import `react-img-view/styles.css` and use the complete default interface.
- **shadcn registry:** install the [Tailwind-styled source](registry/) and edit its JSX and classes in your project.
- **Headless primitives:** import from `react-img-view/primitives` and compose the interface yourself.

All three share the same state, gestures, and animation behavior. Only the owner of the presentation layer changes.

## Compatibility

React 18 or 19, and a browser. The published JavaScript targets ES2020 and relies on `<dialog>.showModal()`, Pointer Events, and `ResizeObserver`, which puts the floor at **Chrome 80, Firefox 98, Safari 15.4**. Importing the preset stylesheet raises it to **Chrome 111, Firefox 113, Safari 16.2**, because the toolbar surface uses CSS `color-mix()`; compose your own UI from `react-img-view/primitives` and the lower floor applies.

## Contributing

Dev setup, repo layout, and the release process are in [CONTRIBUTING.md](CONTRIBUTING.md).

Release history is in [CHANGELOG.md](CHANGELOG.md).
