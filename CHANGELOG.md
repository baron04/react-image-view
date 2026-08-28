# Changelog

Notable changes to `react-img-view`. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The default UI had drifted into needing a translation for every host app: eight
strings rendered as visible text, and all of them were English regardless of
the browser. This cuts that down to one string and lets the rest follow the
visitor rather than the app.

### Breaking

- **`ViewerLabels` no longer has `errorHint`.** The error state's explanatory
  paragraph is gone — the alert icon plus `errorTitle` carry the state, and a
  second sentence of body copy was rarely more than a screen-reader-only
  restatement of it. Drop `errorHint` from any `labels` override; it is now
  ignored by nothing, because the field itself no longer exists to pass.
- **Close, header Download, Retry, and the error state's download-original
  control are icon-only.** Their strings still exist — `labels.close`,
  `labels.download`, `labels.retry`, `labels.downloadOriginal` — but now
  surface only as `aria-label`/`title`, not as rendered text. `errorTitle` is
  the one string `DefaultContent` still renders visibly.
- **Labels default to the browser's language, not always English.** `Root`
  auto-detects via `navigator.language` and picks a bundled pack — currently
  `en` or `zhCN` — falling back to English for anything else. An app that must
  stay in one language regardless of the visitor's browser should pass
  `labels` explicitly (or spread a named pack: `labels={zhCN}`). See
  [src/labels.ts](src/labels.ts) for why this follows the browser rather than
  the app.

### Added

- **`downloadOriginal` on `ViewerLabels`** — the error state's download
  action, distinct from the header's `download` now that the two can carry
  different copy (e.g. "Download the original file" vs "Download").
- **`en`, `zhCN`, and `labelsForLocale` exports** from the package root, so an
  app that wants one bundled pack regardless of the browser can import it
  directly instead of relying on auto-detection.

### Changed

- **The published package no longer ships sourcemaps.** They were 458 KB of
  a 641 KB tarball — 71% of every install's footprint spent on a file a
  browser only fetches on demand, from devtools, for someone stepping into
  this library specifically. `dist/*.js`/`dist/*.cjs` no longer carry a
  `sourceMappingURL` comment either, rather than point at a file that isn't
  there.

## [0.2.1] — 2026-08-26

Both open/close transitions were wrong in 0.2.0 — one silently absent, the
other landing in the wrong place. Neither changes any API.

### Fixed

- **The close animation ran ~24px above where it belonged.** The landing
  position was exact, so this survived a test that asserted only the endpoint.
  `[data-closing]` sets `display: none` on the header and toolbar, which
  reflows the dialog's column and drops the centred image by half the header's
  height — and the flight was measured *before* that reflow, so it spent its
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
  but the common shape is a card — a `<figure>` holding the image *and* a
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
  [customization guide](https://baron04.github.io/react-img-view/customization/#6-labels)
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

[0.2.1]: https://github.com/baron04/react-img-view/releases/tag/v0.2.1
[0.2.0]: https://github.com/baron04/react-img-view/releases/tag/v0.2.0
[0.1.1]: https://github.com/baron04/react-img-view/releases/tag/v0.1.1
[0.1.0]: https://github.com/baron04/react-img-view/releases/tag/v0.1.0
