# Contributing

## Getting set up

```bash
pnpm install
pnpm build          # the docs site imports dist/, so build once first
pnpm vite           # the playground, at localhost:5180
```

| Command              | What it does                                                  |
| -------------------- | ------------------------------------------------------------- |
| `pnpm test`          | Vitest — `core/` in node, the React layer in jsdom            |
| `pnpm e2e`           | Playwright; starts the playground itself                      |
| `pnpm lint`          | ESLint                                                        |
| `pnpm typecheck`     | `tsc --noEmit`                                                |
| `pnpm build`         | tsdown/Rolldown: ESM + CJS + paired declarations into `dist/` |
| `pnpm size`          | Gzip budgets plus consumer tree-shaking fixtures              |
| `pnpm package:check` | `publint` and Are the Types Wrong                             |
| `pnpm docs:build`    | Build the workspace documentation site                        |

A pre-commit hook runs lint and typecheck. CI runs everything, on Node 22;
releases run the same suite on Node 24, which is the version they publish from.

`pnpm registry:build` regenerates the shadcn registry's served JSON into
`docs-site/public/r/` — do this after changing `registry/image-view/
image-view.tsx` or the `cssVars` in `registry.json`.

## Repo layout

| Path          | What it is                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/`        | The package — see "The shape of the codebase" below.                                                                        |
| `docs-site/`  | The workspace documentation app (Astro Starlight — plain markdown/MDX to static HTML, no server, deployed to GitHub Pages). |
| `registry/`   | The shadcn registry source; `registry.json` is the manifest.                                                                |
| `playground/` | A Vite app for developing against `src/` directly — real browser testing, not just unit tests.                              |
| `e2e/`        | Playwright smoke tests driven with real pointer events.                                                                     |

## The shape of the codebase

`src/core/` is framework-agnostic: gesture math, the reducer, spring and decay
physics, the FLIP calculations. It has **no React dependency**, which is what
makes it testable by replaying pointer-event sequences without a DOM. Keep it
that way — if something needs React, it belongs a layer up.

`src/react/` binds that to React. Its `Root` is headless and powers the
`react-img-view/primitives` entry. `src/preset/` is the assembled default UI;
its thin Root wrapper appends `DefaultContent` only for the main entry. There
is no second behaviour implementation under the preset: L1 and L2 are still
L3 with defaults filled in.

The root package and `docs-site/` share `pnpm-workspace.yaml` and one root
lockfile. `react-img-view` remains the only published package; subpath exports
provide boundaries without independent versions.

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

Baselines are per-platform — Playwright suffixes them, so `-darwin.png` and
`-linux.png` sit side by side and neither invalidates the other. CI's
`visual` job enforces the `-linux.png` set on every push, and a missing
baseline fails it rather than skipping. Updating a baseline therefore takes
both platforms: `--update-snapshots` locally writes only the `-darwin.png`
half, and the `-linux.png` half comes from the **Visual baselines** workflow
in the Actions tab — unzip its artifact over `e2e/`, look at the images, and
commit them alongside.

**One functional test is CI-skipped, not deleted.** `e2e/viewer.spec.ts`'s
"the close animation settles smoothly" samples real-time animation position
every rAF frame and checks the tail against a 3px tolerance. It failed
twice on GitHub's runner at growing residuals (5.86px, then 12.5px) while
20+ local runs — including CPU throttling at 6x/20x and a software-rendered
(`--disable-gpu`) browser, both attempting to reproduce a slow-runner-like
environment — stayed under 1px every time. `setTimeout` cannot fire early,
so a slow main thread only ever gives the transition _more_ real time
before the element unmounts, and both reproductions confirmed convergence
under load rather than divergence — which rules out uniform slowness as
the explanation. Whatever GitHub's shared runner actually does (most likely
scheduling stalls specific to shared-VM contention, not raw speed) was not
something reproducible here, so raising the tolerance again would have been
a second guess rather than a verified fix. The test keeps its original,
locally-verified-strict assertion and is skipped only when
`process.env.CI` is set — see the `test.skip(...)` line for the exact
reasoning. If it starts failing locally, that is real and worth
investigating; if a future CI run needs it un-skipped, that should come
with a reproduction, not another tolerance bump.

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

Commit messages are free-form prose, not Conventional Commits. Explain _why_
the change is right, especially when the reason is not obvious from the diff —
most of this codebase's comments exist because someone would otherwise
reasonably undo the thing they describe.

Releases: run `pnpm e2e --project=visual` locally and look at what it renders
(CI only enforces this once Linux baselines are committed — see above), bump
`version` in `package.json`, update `CHANGELOG.md`, merge, then run the
**Release** workflow from the Actions tab. It lints, typechecks,
unit-tests, builds, runs the e2e suite, refuses to republish a version that
already exists, publishes to npm with provenance, tags the commit, and opens
a GitHub release. It defaults to a dry run — untick it to publish for real.

There is no npm token anywhere in this repository. Authentication is npm
[trusted publishing](https://docs.npmjs.com/trusted-publishers/): npm
exchanges the OIDC token GitHub mints for the workflow run for a short-lived
credential, so there is no long-lived secret to leak, rotate, or accidentally
grant to a fork. Publishing this way also attaches a provenance attestation
automatically.

One-time setup, on npmjs.com → the package → **Settings → Trusted
Publisher**:

| Field                | Value            |
| -------------------- | ---------------- |
| Publisher            | GitHub Actions   |
| Organization or user | `baron04`        |
| Repository           | `react-img-view` |
| Workflow filename    | `release.yml`    |
| Environment          | _(leave empty)_  |

The workflow pins Node 24 deliberately: trusted publishing needs npm
&ge; 11.5.1, and Node 22 still bundles npm 10.9.8. A version check runs
before publishing so a future Node bump that regresses npm fails loudly
instead of falling back to an unauthenticated publish.
