import * as React from 'react'
import { Slot } from '../slot'
import { useViewerContext } from '../context'

export interface ControlProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Render the child instead of a button, keeping behaviour and state. */
  asChild?: boolean
}

interface BaseProps extends ControlProps {
  action(): void
  disabled?: boolean
  active?: boolean
  /** Present but inert at the ends of the set; the preset hides it in CSS. */
  boundary?: boolean
  part: string
}

/**
 * Shared body for every control.
 *
 * State ships as `data-*` rather than class names, so a consumer hooks it with
 * `data-[active]:…` in Tailwind or an attribute selector in plain CSS without
 * having to know or match anything we invented.
 */
const Control = React.forwardRef<HTMLButtonElement, BaseProps>(function Control(
  { asChild, action, disabled, active, boundary, part, onClick, children, ...rest },
  ref,
) {
  const Comp: React.ElementType = asChild ? Slot : 'button'
  return (
    <Comp
      {...rest}
      ref={ref}
      {...(asChild ? {} : { type: 'button' as const })}
      data-image-view-control={part}
      data-active={active ? '' : undefined}
      data-boundary={boundary ? '' : undefined}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented || disabled) return
        action()
      }}
    >
      {children}
    </Comp>
  )
})

/**
 * Both halves of the context every control needs. `aria-label` comes from
 * `labels` rather than a literal so the whole set localises from `Group`'s
 * one `labels` prop — an untranslated `aria-label` is an accessibility bug,
 * since a screen reader reads it out whatever the page's `lang` says.
 */
function useControl() {
  const ctx = useViewerContext('Control')
  return { api: ctx.api, labels: ctx.labels }
}

export const Close = React.forwardRef<HTMLButtonElement, ControlProps>(function Close(props, ref) {
  const { api, labels } = useControl()
  return <Control ref={ref} part="close" action={api.close} aria-label={labels.close} {...props} />
})

export const Prev = React.forwardRef<HTMLButtonElement, ControlProps>(function Prev(props, ref) {
  const { api, labels } = useControl()
  return (
    <Control
      ref={ref}
      part="prev"
      action={api.prev}
      disabled={!api.canPrev}
      boundary={!api.canPrev}
      aria-label={labels.prev}
      {...props}
    />
  )
})

export const Next = React.forwardRef<HTMLButtonElement, ControlProps>(function Next(props, ref) {
  const { api, labels } = useControl()
  return (
    <Control
      ref={ref}
      part="next"
      action={api.next}
      disabled={!api.canNext}
      boundary={!api.canNext}
      aria-label={labels.next}
      {...props}
    />
  )
})

export const ZoomIn = React.forwardRef<HTMLButtonElement, ControlProps>(
  function ZoomIn(props, ref) {
    const { api, labels } = useControl()
    return (
      <Control
        ref={ref}
        part="zoom-in"
        action={() => api.zoomBy(1.4)}
        disabled={!api.canZoomIn}
        aria-label={labels.zoomIn}
        {...props}
      />
    )
  },
)

export const ZoomOut = React.forwardRef<HTMLButtonElement, ControlProps>(
  function ZoomOut(props, ref) {
    const { api, labels } = useControl()
    return (
      <Control
        ref={ref}
        part="zoom-out"
        action={() => api.zoomBy(1 / 1.4)}
        disabled={!api.canZoomOut}
        aria-label={labels.zoomOut}
        {...props}
      />
    )
  },
)

export const RotateLeft = React.forwardRef<HTMLButtonElement, ControlProps>(
  function RotateLeft(props, ref) {
    const { api, labels } = useControl()
    return (
      <Control
        ref={ref}
        part="rotate-left"
        action={() => api.rotate(-90)}
        aria-label={labels.rotateLeft}
        {...props}
      />
    )
  },
)

export const RotateRight = React.forwardRef<HTMLButtonElement, ControlProps>(
  function RotateRight(props, ref) {
    const { api, labels } = useControl()
    return (
      <Control
        ref={ref}
        part="rotate-right"
        action={() => api.rotate(90)}
        aria-label={labels.rotateRight}
        {...props}
      />
    )
  },
)

export const FitToWindow = React.forwardRef<HTMLButtonElement, ControlProps>(
  function FitToWindow(props, ref) {
    const { api, labels } = useControl()
    return (
      <Control
        ref={ref}
        part="fit"
        action={api.fit}
        // Neither this nor ActualSize is active between the two, which is why
        // they are separate buttons and not a segmented control: a segmented
        // control claims one of its options is always chosen.
        active={Math.abs(api.scale - api.fitScale) < 1e-3}
        aria-label={labels.fitToWindow}
        {...props}
      />
    )
  },
)

export const ActualSize = React.forwardRef<HTMLButtonElement, ControlProps>(
  function ActualSize(props, ref) {
    const { api, labels } = useControl()
    return (
      <Control
        ref={ref}
        part="actual-size"
        action={api.actualSize}
        active={Math.abs(api.scale - 1) < 1e-3}
        aria-label={labels.actualSize}
        {...props}
      />
    )
  },
)

export interface DownloadProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean
}

export const Download = React.forwardRef<HTMLAnchorElement, DownloadProps>(function Download(
  { asChild, children, ...rest },
  ref,
) {
  const { images, api, labels } = useViewerContext('Download')
  const current = images[api.index]
  const Comp: React.ElementType = asChild ? Slot : 'a'
  return (
    <Comp
      {...rest}
      ref={ref}
      data-image-view-control="download"
      href={current?.downloadUrl ?? current?.src}
      // A bare filename asks the browser to save rather than navigate. It only
      // applies same-origin, so a cross-origin URL still opens — worth knowing
      // before filing it as a bug.
      download={current?.name ?? ''}
      aria-label={labels.download}
    >
      {children}
    </Comp>
  )
})
