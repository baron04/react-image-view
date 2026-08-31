import * as React from 'react'
import type { TriggerRegistration } from './context'
import type { ImageItem } from '../types'

/**
 * Which triggers exist, where they sit, and where they are on screen.
 *
 * Separate from `Group` because it shares nothing with the rest of it: no
 * transform, no ticker, no animation state. It answers three questions —
 * who registered, in what order, and what is that one's geometry right now —
 * and the last is what both FLIP flights measure against.
 */
export function useTriggerRegistry(imagesProp: ImageItem[] | undefined) {
  const registry = React.useRef<TriggerRegistration[]>([])
  // Bumped on every register/unregister so the `images` memo below actually
  // recomputes when the "derive images from registered triggers" path is in
  // play (no `images` prop given). Registering by itself was not state, so
  // nothing ever re-rendered Group to pick up a newly mounted ImageView —
  // `images`/`total` would silently stay at whatever they were on first
  // render. Every real usage in this codebase passes `images` explicitly and
  // never hit this, which is exactly how it went unnoticed.
  const [version, setVersion] = React.useState(0)

  const registerTrigger = React.useCallback((reg: TriggerRegistration) => {
    registry.current.push(reg)
    registry.current.sort((a, b) => (a.index ?? Infinity) - (b.index ?? Infinity))
    setVersion((v) => v + 1)
    return () => {
      registry.current = registry.current.filter((r) => r.id !== reg.id)
      setVersion((v) => v + 1)
    }
  }, [])

  const indexOf = React.useCallback((id: string) => {
    const at = registry.current.findIndex((r) => r.id === id)
    return at < 0 ? 0 : at
  }, [])

  const getTriggerGeometry = React.useCallback(
    (at: number) => registry.current[at]?.getGeometry() ?? null,
    [],
  )

  // Reads registry.current during render on purpose — this is the fallback
  // path's only source of truth, and `version` is exactly what makes that
  // safe: it is bumped synchronously (in the same commit) whenever the ref's
  // contents change, so this memo is never looking at a stale snapshot the
  // way an uncoordinated ref read would be. It has to stay in the dependency
  // array for that guarantee to mean anything, even though the linter cannot
  // see it being read inside the callback body.
  const images: ImageItem[] = React.useMemo(
    // eslint-disable-next-line react-hooks/refs -- see comment above
    () => imagesProp ?? registry.current.map((r) => r.item),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
    [imagesProp, version],
  )

  return { images, registerTrigger, indexOf, getTriggerGeometry }
}
