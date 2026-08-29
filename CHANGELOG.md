# Changelog

Notable changes to `react-img-view`. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] — 2026-08-30

This release separates the preset from the headless entry, makes localisation
deterministic, and puts the published size and package shape under automated
checks.

### Breaking

- **`ViewerLabels` no longer has `errorHint` or `downloadOriginal`.** The
  default error is now one short line plus a retry icon; it no longer renders
  an explanatory paragraph, alert decoration, or a second download action.
- **Labels no longer follow `navigator.language`.** Stable English defaults
  keep SSR and hydration identical. Select another language explicitly via
  `labels`; Simplified Chinese moved from the package root to the opt-in
  `react-img-view/locales/zh-CN` entry.
- **`zhCN`, `labelsForLocale`, and the `core` namespace are no longer exported
  from the package root.** Import the locale and low-level functions from
  `react-img-view/locales/zh-CN` and `react-img-view/core` respectively.
- **`Extension.onGesture` was removed.** It was exposed in the type but never
  called. Pointer gestures remain owned by Stage's state machine;
  `Extension.onKeyDown` remains the keyboard escape hatch.

### Added

- **`react-img-view/imperative`** — an `ImagePreview.open()` function that
  lazily mounts a viewer, returns close/navigation commands, and automatically
  removes its React root and temporary host after closing.
- **`ImageView.Image.renderImage`** — replace the full-size image with a
  `<picture>` or another image component while preserving the viewer's supplied
  source, sizing, loading, retry, and transform plumbing. The preset exposes the
  same option through `DefaultContent` and the imperative entry.
- **`react-img-view/primitives`** — semantic React parts and the pure headless
  `Root`, without `SingleImage`, `DefaultContent`, preset icons, or automatic
  chrome.
- **`react-img-view/core`** and **`react-img-view/locales/zh-CN`** as explicit,
  independently tree-shakeable public entries.
- Gzip budgets for every public runtime entry and the CSS preset, plus real
  consumer bundles that verify tree-shaking.
- `publint` and Are the Types Wrong checks for both ESM and CJS declarations.
- Documentation guards for stale API claims and broken local links, compiled
  TypeScript examples, and generated-HTML checks for invalid MDX nesting and
  production canonical URLs.

### Changed

- The default error keeps `retry()` and `role="alert"`, but renders the action
  as an icon-only button with `aria-label` and `title`.
- A real consumer bundle using the full preset is 11.6 kB gzip (down from
  13.2 kB), a primitives composition is 10.4 kB, and the minified CSS preset
  is 1.7 kB.
- The build moved from unmaintained tsup to tsdown/Rolldown. ESM, CJS, paired
  declarations, `"use client"`, and sourcemap-free output are preserved.
- The package and documentation site now share one pnpm workspace and lockfile.
- The README, documentation landing pages, and Chinese design article now
  describe the headless/preset boundary precisely and compare alternatives by
  use case instead of relying on volatile bundle-size claims.
- Documentation demos and fonts are self-hosted, removing Picsum and Google
  Fonts as availability, privacy, and layout-stability dependencies.

### Fixed

- Wheel zoom now publishes its transform on the next animation frame, keeping
  `useViewer()` and active toolbar states in sync with the painted image.
- Pinch coordinates are relative to `Stage`, so embedded or offset viewers zoom
  around the actual touch midpoint.
- Trigger registration honours explicit indices regardless of asynchronous
  mount order and refreshes when image metadata changes.
- Calling `preventDefault()` in a slotted child's event handler now prevents
  the component's built-in action as documented.
- Scroll locking is reference-counted, so closing one of multiple open viewers
  no longer unlocks the page behind the others.
- `pointercancel` restores an interrupted page or dismiss gesture instead of
  accidentally committing it.

## [0.2.1] — 2026-08-26

Both open/close transitions were wrong in 0.2.0 — one silently absent, the
other landing in the wrong place. Neither changes any API.

### Fixed

- **The close animation ran ~24px above where it belonged.** The landing
  position was exact, so this survived a test that asserted only the endpoint.
  `[data-closing]` sets `display: none` on the header and toolbar, which
  reflows the dialog's column and drops the centred image by half the header's
  height — and the flight was measured _before_ that reflow, so it spent its
  whole length offset and agreed with the thumbnail only on the final frame,
  when removing the attribute restored the layout the numbers had assumed.
  That read as the image settling too high and then snapping into place. The
  stage is now measured after the attribute is applied, and the attribute is
  no longer removed before the dialog unmounts.
- **Opening did not animate at all.** The entry flight started with correct
  geometry and was then erased inside the same commit, before a frame was
  painted: the refit effect treats `framedFor !== index` as a slide change, a
  slide change deliberately overrides every guard (including "an animation is
  running"), and on the first open that comparison is `null !== 0`. So refit
  read the entry flight as a page turn, cancelled it, and snapped straight to
  the fitted scale. Closing animated normally throughout, which is what made
  this easy to miss by eye. Measured over 900ms after a click: 1 distinct
  scale before the fix, 61 after.
- **Closing landed on the trigger's box rather than the picture's.**
  `readGeometry` measured the trigger while reading `fit` from the `<img>`
  inside it. Those are the same element when the trigger is a bare `<img>`,
  but the common shape is a card — a `<figure>` holding the image _and_ a
  caption — and against that the flight flew to a box taller than the
  thumbnail by the height of the caption, so the close ended on a visible
  jump. Measured on the docs site: figure 225×222, image 223×167.

## [0.2.0] — 2026-08-26

The headline is that the viewer is now usable without a mouse, and that its
interface is in English. Both were serious enough that `0.1.x` should be
considered unfit for production.

### Breaking

- **`DefaultContent` no longer takes `errorTitle` / `errorHint`.** Every
  user-facing string now lives in one place — `labels` on `Root`. Move
  `errorTitle="…"` to `labels={{ errorTitle: '…' }}`.
- **The interface is English by default.** `0.1.x` rendered its buttons and
  every `aria-label` in Chinese regardless of the host application. If you
  were relying on that, pass the Chinese strings explicitly via `labels`; the
  [customization guide](https://baron04.github.io/react-img-view/customization/#7-labels)
  has a complete example.
- **`Trigger` now adds `role="button"` and `tabIndex` to its child** when the
  child is not already interactive. If you were styling triggers with
  attribute selectors, or asserting on their rendered attributes, that markup
  has changed.
- **The thumbnail strip no longer uses `role="tablist"` / `role="tab"`.** It is
  a `role="group"` of buttons with `aria-current`. Selectors targeting the old
  roles need updating.

### Added

- `labels` prop on `Root` (and on the L1 `<ImageView>`) overriding any subset of
  the user-facing strings, merged field by field over the English defaults.
- `useLabels()` so custom controls localise from the same source as the
  built-in ones, and `defaultLabels` for extending rather than replacing.
- Keyboard activation of triggers — `Enter` and `Space` — with focus returned
  to the trigger when the viewer closes.
- A polite live region announcing the current slide, so paging is no longer
  silent to a screen reader.
- Background scroll lock while the viewer is open.

### Fixed

- **The toolbar and the prev/next arrows did not respond to a mouse or a real
  touch.** They are rendered inside `Stage`, which captured the pointer on
  every `pointerdown` — including ones that started on a control. Pointer
  capture redirects the following `pointerup` away from the button, and the
  browser only synthesises a click when both land on the same element, so no
  click was ever produced. Keyboard shortcuts worked throughout, which is why
  this survived review.
- **The viewer could not be opened from the keyboard at all** (WCAG 2.1.1).
  `Trigger` attached only `onClick`, so a `<div>`, `<figure>`, or styled card —
  what most callers pass — was unreachable.
- L2's "derive images from registered triggers" path never re-rendered `Root`,
  so a trigger that mounted later was missing from the set.
- `Image` republished an equal-but-new `natural` size on every layout pass,
  and `Trigger`'s registration effect depended on the whole context value.
  Both caused avoidable re-render churn.

### Changed

- Published through npm trusted publishing (OIDC). Releases now carry a
  provenance attestation and there is no npm token stored anywhere.

### Internal

- ESLint, Prettier, and a pre-commit hook.
- CI on every push and pull request; a guarded release workflow.
- Playwright end-to-end tests driven with real pointer events, an
  accessibility suite including `axe-core`, and visual regression baselines.
- React-layer component tests — previously all 60 unit tests were in `core/`,
  and both bugs that reached npm were in the untested half.

## [0.1.1] — 2026-08-26

### Fixed

- Toolbar and navigation controls not responding to pointer input. Superseded
  by 0.2.0; this release fixed the behaviour but still shipped the Chinese
  interface and the keyboard-inaccessible trigger.

## [0.1.0] — 2026-08-25

First publish. Withdrawn in practice: the toolbar was non-functional under a
mouse.

[0.3.0]: https://github.com/baron04/react-img-view/releases/tag/v0.3.0
[0.2.1]: https://github.com/baron04/react-img-view/releases/tag/v0.2.1
[0.2.0]: https://github.com/baron04/react-img-view/releases/tag/v0.2.0
[0.1.1]: https://github.com/baron04/react-img-view/releases/tag/v0.1.1
[0.1.0]: https://github.com/baron04/react-img-view/releases/tag/v0.1.0
