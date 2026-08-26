# Changelog

Notable changes to `react-img-view`. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.0]: https://github.com/baron04/react-img-view/releases/tag/v0.2.0
[0.1.1]: https://github.com/baron04/react-img-view/releases/tag/v0.1.1
[0.1.0]: https://github.com/baron04/react-img-view/releases/tag/v0.1.0
