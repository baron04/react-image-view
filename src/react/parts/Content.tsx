import * as React from 'react'
import { createPortal } from 'react-dom'
import { useViewerContext } from '../context'
import { useKeyboard } from '../useKeyboard'
import { useIsomorphicLayoutEffect } from '../useIsomorphicLayoutEffect'

export interface ContentProps extends React.HTMLAttributes<HTMLDialogElement> {
  children?: React.ReactNode
}

/** Whether we are on the client never changes after hydration, so there is
 *  nothing to subscribe to — but the store contract requires a subscribe. */
const subscribeNever = () => () => {}

let scrollLockCount = 0
let savedScrollStyles: [string, string] = ['', '']

/**
 * Put focus back where it came from once the viewer closes.
 *
 * `showModal()` does restore focus on close by itself — but only to whatever
 * was focused when it opened, and a click does not reliably focus the clicked
 * element (Safari notably does not focus buttons on click). Without this the
 * viewer often closes with focus back on `<body>`, dropping a keyboard user
 * at the top of the page and losing their place in the list they opened from.
 */
function useFocusReturn(open: boolean): void {
  const previous = React.useRef<HTMLElement | null>(null)

  useIsomorphicLayoutEffect(() => {
    if (!open) return
    previous.current = document.activeElement as HTMLElement | null

    return () => {
      const el = previous.current
      previous.current = null
      // The trigger may have unmounted while the viewer was open — a virtual
      // list scrolled, a route changed — and focusing a detached node throws
      // focus to <body> anyway, so check it is still connected first.
      if (el?.isConnected) el.focus({ preventScroll: true })
    }
  }, [open])
}

/**
 * Hold the page still behind the modal.
 *
 * `showModal()` makes the background inert to clicks but not to scrolling, so
 * a touch drag the gesture layer declines to claim scrolls the page underneath
 * — worst on iOS, and worst of all on a component whose headline feature is
 * touch gestures. The padding compensation stops the page shifting sideways
 * as the scrollbar disappears on desktop.
 */
function useScrollLock(open: boolean): void {
  React.useEffect(() => {
    if (!open) return
    const { body, documentElement: root } = document
    if (!scrollLockCount++) {
      savedScrollStyles = [body.style.overflow, body.style.paddingRight]
      const gap = window.innerWidth - root.clientWidth
      body.style.overflow = 'hidden'
      if (gap > 0) body.style.paddingRight = `${gap}px`
    }
    return () => {
      if (--scrollLockCount) return
      ;[body.style.overflow, body.style.paddingRight] = savedScrollStyles
    }
  }, [open])
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
  // The portal target only exists in the browser, so rendering has to wait for
  // hydration. `useSyncExternalStore` rather than a setState-in-effect flag:
  // it is the supported way to give the server and the client different
  // answers to the same question, and it says so declaratively instead of
  // triggering a second render pass.
  const mounted = React.useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )

  // Declared before the showModal effect below, and deliberately: effects run
  // in declaration order, and `showModal()` moves focus into the dialog. Read
  // afterwards, `document.activeElement` is already something inside the
  // viewer, and the element worth returning to is gone.
  useFocusReturn(ctx.api.open)

  // Layout effect, so the modal state is committed before the first paint —
  // in a passive effect the dialog shows for a frame as a plain element.
  React.useLayoutEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (ctx.api.open && !el.open) el.showModal()
    else if (!ctx.api.open && el.open) el.close()
  }, [ctx.api.open])

  useScrollLock(ctx.api.open)

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
      <SlideAnnouncer />
      {children}
    </dialog>,
    target,
  )
})

/**
 * Announces the current slide to assistive tech.
 *
 * Paging changes `Title` and the picture, and neither is announced: a screen
 * reader user pressing the arrow keys got silence and no way to tell whether
 * anything moved. This is the standard carousel remedy — a polite live region
 * carrying "name (n of total)".
 *
 * Rendered by `Content` rather than by the preset so a hand-composed L3 layout
 * gets it too, and styled inline rather than from `styles.css` because the
 * library has to work with no stylesheet loaded at all.
 */
function SlideAnnouncer() {
  const { images, api, labels } = useViewerContext('Content')
  const current = images[api.index]
  const name = current?.name ?? current?.alt ?? labels.thumbnailAt(api.index)

  return (
    <div
      data-image-view-announcer=""
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        border: 0,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        clipPath: 'inset(50%)',
        whiteSpace: 'nowrap',
      }}
    >
      {api.total > 1 ? `${name} (${api.index + 1} / ${api.total})` : name}
    </div>
  )
}
