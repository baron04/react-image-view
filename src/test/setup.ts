/**
 * jsdom is missing several APIs the viewer relies on. Each stub below exists
 * because its absence throws rather than degrades — the component would fail
 * to mount at all, which tells you nothing about the behaviour under test.
 *
 * Only loaded for the React tests; `core/` runs in plain node (see
 * vitest.config.ts).
 */
import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'

beforeAll(() => {
  if (typeof window === 'undefined') return

  // jsdom implements <dialog> as an ordinary element: no showModal/close, and
  // no `open` bookkeeping. Content calls these directly on mount.
  const proto = window.HTMLDialogElement?.prototype
  if (proto && !proto.showModal) {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true
    }
    proto.close = function close(this: HTMLDialogElement) {
      this.open = false
      this.dispatchEvent(new window.Event('close'))
    }
  }

  if (!window.ResizeObserver) {
    // Never fires. Stage measures itself synchronously in a layout effect
    // first and only uses the observer for later changes, so tests that do
    // not resize anything see the same geometry either way.
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }

  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }

  // Pointer capture is unimplemented in jsdom and Stage calls it on every
  // pointerdown.
  const el = window.Element.prototype as unknown as Record<string, unknown>
  el.setPointerCapture ??= () => {}
  el.releasePointerCapture ??= () => {}
  el.hasPointerCapture ??= () => false
})

afterEach(cleanup)
