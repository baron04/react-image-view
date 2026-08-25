import * as React from 'react'
import { Slot } from '../slot'
import { useViewerContext } from '../context'
import type { ImageItem } from '../../types'
import type { ThumbnailFit } from '../../core/flip'

export interface TriggerProps extends ImageItem {
  children: React.ReactElement
  /**
   * Position among the slides. Registration order is used when this is left
   * off, which is right for a plain list; pass it explicitly wherever mount
   * order and visual order can diverge — virtualised tables, Suspense
   * boundaries, anything that streams in.
   */
  index?: number
  disabled?: boolean
}

/**
 * How the trigger actually displays the image, read from the real DOM rather
 * than assumed. `asChild` means the rendered element could be anything — the
 * `<img>` itself, or a wrapper around one — so this looks at the node first,
 * then its first `<img>` descendant. `contain` (nothing hangs outside the
 * box) is the fallback for everything else: a `<div>` with a background
 * image, `next/image` with `fill` and its own wrapper, anything this can't
 * actually inspect. Getting this wrong for a `cover`-fit thumbnail is a real
 * bug, not a cosmetic one — the FLIP flight's final frame visibly does not
 * match the thumbnail underneath it (see core/flip.ts).
 */
function detectFit(img: HTMLImageElement): ThumbnailFit {
  return getComputedStyle(img).objectFit === 'cover' ? 'cover' : 'contain'
}

function readGeometry(node: HTMLElement | null) {
  if (!node) return null
  const img = node instanceof HTMLImageElement ? node : node.querySelector('img')
  return { rect: node.getBoundingClientRect(), fit: img ? detectFit(img) : ('contain' as ThumbnailFit) }
}

let uid = 0

export const Trigger = React.forwardRef<HTMLElement, TriggerProps>(function Trigger(
  { children, index, disabled, ...item },
  forwardedRef,
) {
  const ctx = useViewerContext('Trigger')
  const nodeRef = React.useRef<HTMLElement | null>(null)
  const id = React.useMemo(() => `trigger-${++uid}`, [])

  React.useEffect(
    () =>
      ctx.registerTrigger({
        id,
        item,
        getGeometry: () => readGeometry(nodeRef.current),
      }),
    // `ctx.registerTrigger`, not `ctx` itself: `ctx` is a new object on
    // nearly every Root render (its `api` carries the live transform), and
    // depending on it re-ran this effect — re-registering, which now bumps
    // registryVersion — on every one of those, not just on a real change to
    // what's being registered.
    // `item` is spread from props; re-registering on every field would thrash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx.registerTrigger, id, item.src, item.alt, item.name],
  )

  return (
    <Slot
      ref={(node: HTMLElement) => {
        nodeRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }}
      data-image-view-trigger=""
      data-disabled={disabled ? '' : undefined}
      onClick={() => {
        if (disabled) return
        ctx.openAt(index ?? ctx.indexOf(id), readGeometry(nodeRef.current))
      }}
    >
      {children}
    </Slot>
  )
})
