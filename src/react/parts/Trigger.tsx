import * as React from 'react'
import { Slot } from '../slot'
import { useViewerContext } from '../context'
import { useIsomorphicLayoutEffect } from '../useIsomorphicLayoutEffect'
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

/**
 * Elements the browser already focuses and already activates from the
 * keyboard. For these, `Trigger` adds nothing: a second role would fight the
 * element's own semantics, and a second key handler would open the viewer
 * twice on one Enter.
 *
 * Deliberately does **not** include `[tabindex]`. `Trigger` adds `tabindex`
 * itself, so matching on it would make this test depend on its own output —
 * the element would read as interactive on the pass after it was made
 * focusable, the semantics would be withdrawn, and the two states would
 * alternate forever.
 */
const NATIVELY_INTERACTIVE = 'button, a[href], input, select, textarea, summary'

let uid = 0

export const Trigger = React.forwardRef<HTMLElement, TriggerProps>(function Trigger(
  { children, index, disabled, ...item },
  forwardedRef,
) {
  const ctx = useViewerContext('Trigger')
  const nodeRef = React.useRef<HTMLElement | null>(null)
  const id = React.useMemo(() => `trigger-${++uid}`, [])

  /**
   * Whether this trigger has to supply its own button semantics.
   *
   * `Trigger` renders whatever it is given, and most callers give it an
   * `<img>`, a `<div>`, or a styled card — none of which a keyboard can reach.
   * Until this existed the viewer could not be opened without a mouse at all.
   *
   * Decided from the mounted node rather than from `children.type`, because
   * the child is often a component whose rendered element is unknowable from
   * here — and guessing wrong in the other direction is worse: forcing
   * `role="button"` onto an `<a href>` would destroy its link semantics.
   */
  const [needsButtonSemantics, setNeedsButtonSemantics] = React.useState(false)

  // A caller who set either of these on the child has made their own
  // decision about focus and semantics; don't overrule it.
  const childProps = children.props as { tabIndex?: number; role?: string }
  const callerHandledIt = childProps.tabIndex !== undefined || childProps.role !== undefined

  useIsomorphicLayoutEffect(() => {
    const el = nodeRef.current
    setNeedsButtonSemantics(!!el && !callerHandledIt && !el.matches(NATIVELY_INTERACTIVE))
  }, [children, callerHandledIt])

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

  const open = () => {
    if (disabled) return
    // Take focus before opening so there is something to hand it back to.
    // Clicking does not reliably focus the clicked element — Safari famously
    // does not — so without this a mouse user closes the viewer and lands on
    // <body>, having lost their place in the list. `:focus-visible` keeps
    // this from drawing a focus ring for the mouse case.
    nodeRef.current?.focus({ preventScroll: true })
    ctx.openAt(index ?? ctx.indexOf(id), readGeometry(nodeRef.current))
  }

  return (
    <Slot
      ref={(node: HTMLElement) => {
        nodeRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }}
      data-image-view-trigger=""
      data-disabled={disabled ? '' : undefined}
      {...(needsButtonSemantics
        ? {
            role: 'button',
            // -1 rather than dropping it entirely: a disabled trigger stays
            // out of the tab order but can still be focused programmatically,
            // which is what lets focus be restored to it after closing.
            tabIndex: disabled ? -1 : 0,
            'aria-disabled': disabled || undefined,
          }
        : null)}
      onClick={open}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        // Only when we were the ones who made this focusable. A native
        // control turns Enter/Space into a click itself and this handler
        // still runs for it, so acting here as well would open the viewer
        // twice on one keypress. Keyed off what we did rather than a fresh
        // DOM check, which would be reading back our own `tabindex`.
        if (!needsButtonSemantics) return
        if (event.key !== 'Enter' && event.key !== ' ') return
        // Space scrolls the page unless claimed.
        event.preventDefault()
        open()
      }}
    >
      {children}
    </Slot>
  )
})
