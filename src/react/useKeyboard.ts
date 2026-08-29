import * as React from 'react'
import type { Extension, ViewerApi } from '../types'

/**
 * Two tiers, and the split is deliberate.
 *
 * Arrows, Escape and the zoom keys are what anyone already expects from an
 * image preview. The rest — fit, actual size, rotate — are borrowed from
 * professional tools and are less universal. They are wired up and surfaced
 * in tooltips, but nothing is reachable only through them: every one has a
 * button.
 */
export function useKeyboard(
  node: HTMLElement | null,
  api: ViewerApi,
  extensions: Extension[],
  enabled: boolean,
): void {
  const apiRef = React.useRef(api)
  const extRef = React.useRef(extensions)
  // A passive effect, not written during render: nothing reads either ref
  // before a keydown fires, which is always well after mount, so there is no
  // timing reason to pay for a layout effect here.
  React.useEffect(() => {
    apiRef.current = api
    extRef.current = extensions
  })

  React.useEffect(() => {
    if (!node || !enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      const viewer = apiRef.current

      // Extensions get first refusal, so one can claim a key outright.
      for (const extension of extRef.current) {
        if (extension.onKeyDown?.(event, viewer) === true) return
      }

      // Leave anything typed into a field alone.
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? ''))
        return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const run = (fn: () => void) => {
        event.preventDefault()
        fn()
      }

      switch (event.key) {
        case 'ArrowLeft':
          return run(viewer.prev)
        case 'ArrowRight':
          return run(viewer.next)
        case 'Home':
          return run(() => viewer.go(0))
        case 'End':
          return run(() => viewer.go(viewer.total - 1))
        case '+':
        case '=':
          return run(() => viewer.zoomBy(1.4))
        case '-':
        case '_':
          return run(() => viewer.zoomBy(1 / 1.4))
        case '0':
          return run(viewer.fit)
        case '1':
          return run(viewer.actualSize)
        case 'r':
        case 'R':
          return run(() => viewer.rotate(event.shiftKey ? -90 : 90))
        // Escape is left to the dialog, which raises `cancel`; handling it here
        // as well would close twice.
        default:
          return
      }
    }

    node.addEventListener('keydown', onKeyDown)
    return () => node.removeEventListener('keydown', onKeyDown)
  }, [node, enabled])
}
