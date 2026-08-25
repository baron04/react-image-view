import * as React from 'react'
import { createPortal } from 'react-dom'
import { useViewerContext } from '../context'
import { useKeyboard } from '../useKeyboard'

export interface ContentProps extends React.HTMLAttributes<HTMLDialogElement> {
  children?: React.ReactNode
}

/**
 * The modal surface: a native `<dialog>` rendered through a portal.
 *
 * The two mechanisms are complementary, not alternatives. `showModal()` buys
 * the top layer, the focus trap, Escape, and `::backdrop` — all the behaviour.
 * The portal buys style isolation, which the top layer does not: a top-layer
 * element still sits where it was written in the DOM, so it keeps inheriting
 * the host's fonts and colours and keeps matching its descendant selectors.
 */
export const Content = React.forwardRef<HTMLDialogElement, ContentProps>(function Content(
  { children, ...rest },
  forwardedRef,
) {
  const ctx = useViewerContext('Content')
  const dialogRef = React.useRef<HTMLDialogElement | null>(null)
  // Kept in state as well as a ref so the keyboard effect re-runs once the
  // node actually exists.
  const [dialogNode, setDialogNode] = React.useState<HTMLDialogElement | null>(null)
  const [mounted, setMounted] = React.useState(false)

  // The portal target only exists in the browser.
  React.useEffect(() => setMounted(true), [])

  // Layout effect, so the modal state is committed before the first paint —
  // in a passive effect the dialog shows for a frame as a plain element.
  React.useLayoutEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (ctx.api.open && !el.open) el.showModal()
    else if (!ctx.api.open && el.open) el.close()
  }, [ctx.api.open])

  useKeyboard(dialogNode, ctx.api, ctx.extensions, ctx.api.open)

  if (!mounted || !ctx.api.open) return null

  const target = ctx.container ?? document.body

  return createPortal(
    <dialog
      {...rest}
      ref={(node) => {
        dialogRef.current = node
        setDialogNode(node)
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }}
      data-image-view=""
      data-state={ctx.api.open ? 'open' : 'closed'}
      aria-label={ctx.labels.viewer}
      onCancel={(event) => {
        // Escape reaches us as `cancel`; route it through the same path as the
        // close button so a controlled `open` stays authoritative.
        event.preventDefault()
        ctx.api.close()
      }}
    >
      {children}
    </dialog>,
    target,
  )
})
