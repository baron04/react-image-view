# Contributing

## Getting set up

```bash
pnpm install
pnpm build          # the docs site imports dist/, so build once first
pnpm vite           # the playground, at localhost:5180
```

| Command | What it does |
|---|---|
| `pnpm test` | Vitest — `core/` in node, the React layer in jsdom |
| `pnpm e2e` | Playwright; starts the playground itself |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm build` | ESM + CJS + `.d.ts` into `dist/` |

A pre-commit hook runs lint and typecheck. CI runs everything, on Node 22;
releases run the same suite on Node 24, which is the version they publish from.

## The shape of the codebase

`src/core/` is framework-agnostic: gesture math, the reducer, spring and decay
physics, the FLIP calculations. It has **no React dependency**, which is what
makes it testable by replaying pointer-event sequences without a DOM. Keep it
that way — if something needs React, it belongs a layer up.

`src/react/` binds that to React. `src/preset/` is the assembled default UI.
There is no private implementation under the preset: L1 and L2 are L3 with
defaults filled in, so anything `DefaultContent` can do, hand-written
composition can too.

## Testing: what actually catches things

Two bugs reached npm in `0.1.x`. Both are worth knowing about, because they
explain why the suite is shaped the way it is.

**Use real pointer events, never `element.click()`.** The toolbar was
completely dead to a mouse for an entire release because `Stage` captured the
pointer on every `pointerdown`, including ones starting on a button — which
stops the browser synthesising a click. A synthetic `.click()` bypasses the
pointer path entirely and passes regardless. `page.click()` in Playwright does
the real sequence; use it.

**Don't test only with the keyboard.** The same bug survived review partly
because the keyboard shortcuts worked perfectly — they never go through
`Stage`'s pointer handling. Whichever input you reach for first, check the
other one too.

**New behaviour that touches the DOM contract needs an a11y test.** The
trigger being unreachable by keyboard survived several careful review passes
because nothing mechanically checked. `e2e/a11y.spec.ts` runs `axe-core` and a
keyboard-only walkthrough.

**Visual states need a screenshot.** The FLIP resting frame, the fitted scale,
the `cover`/`contain` crop — none of these are visible to a `data-state`
assertion. `e2e/visual.spec.ts` holds the baselines; update them deliberately
with `pnpm e2e e2e/visual.spec.ts --update-snapshots` and look at the diff.

## Gesture feel

Every constant that shapes how the viewer feels — the distance a pan must
overshoot before it hands off to the pager, how hard a flick decays, the
trackpad pinch rate — lives in [`src/core/tuning.ts`](src/core/tuning.ts),
with a comment on each explaining what it trades against.

**These values have been validated on exactly one physical device.** They have
been exercised hard in simulation and through synthetic touch events in a real
browser, but latency, event rate, screen size, and finger friction vary enough
across hardware that one device is not a matrix. If a gesture feels wrong on
yours, that is a real report and not user error.

A pull request changing a number in `tuning.ts` is genuinely useful — please
say which device and browser you felt it on. That context is the part we
cannot reproduce.

## Two places that must stay in sync

The CSS preset (`src/styles.css`) and the shadcn registry block
(`registry/image-view/image-view.tsx`) are the same design expressed twice —
custom properties in one, Tailwind classes in the other. A change to the
palette or the composition has to land in both. `pnpm registry:check` compares
the set of controls they expose and fails if they have drifted; it runs in CI.

## Commits and releases

Commit messages are free-form prose, not Conventional Commits. Explain *why*
the change is right, especially when the reason is not obvious from the diff —
most of this codebase's comments exist because someone would otherwise
reasonably undo the thing they describe.

Releases: bump `version` in `package.json`, update `CHANGELOG.md`, merge, then
run the **Release** workflow from the Actions tab. It defaults to a dry run.
Publishing uses npm trusted publishing, so there is no token to manage.
