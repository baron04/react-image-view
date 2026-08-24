import * as React from 'react'
import { ViewerProvider, type TriggerRegistration, type ViewerContextValue, type ViewerInternals } from '../context'
import type { ImageItem, ImageViewRootProps, ViewerApi, ViewerStatus } from '../../types'
import type { Size, Transform } from '../../core/types'
import { IDENTITY, clamp, fitScale as computeFit, maxScale as computeMax, zoomAbout } from '../../core/transform'
import { Ticker } from '../../core/ticker'
import { animateTransform } from '../../core/animate'
import { prefersReducedMotion, transformFromRect } from '../../core/flip'

/** Exits run quicker than entrances; a slow dismissal feels like a stall. */
const EXIT_STIFFNESS = 900
import { paintImage, paintTrack } from '../paint'
import { useIsomorphicLayoutEffect } from '../useIsomorphicLayoutEffect'

function useControllable<T>(
  controlled: T | undefined,
  initial: T,
  onChange?: (value: T) => void,
): [T, (value: T) => void] {
  const [internal, setInternal] = React.useState(initial)
  const isControlled = controlled !== undefined
  const value = isControlled ? controlled : internal
  const set = React.useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next)
      onChange?.(next)
    },
    [isControlled, onChange],
  )
  return [value, set]
}

export function Root({
  images: imagesProp,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  container = null,
  extensions = [],
  children,
}: ImageViewRootProps) {
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const [index, setIndex] = useControllable(indexProp, defaultIndex, onIndexChange)
  const [transform, setTransform] = React.useState<Transform>(IDENTITY)
  const [stageSize, setStageSizeState] = React.useState<Size>({ width: 0, height: 0 })
  // ResizeObserver reports on every layout pass, not only on real changes.
  // Storing an equal-but-new object each time would re-render the tree for
  // nothing — and rebuild every memo hanging off it.
  const setStageSize = React.useCallback((next: Size) => {
    setStageSizeState((prev) =>
      prev.width === next.width && prev.height === next.height ? prev : next,
    )
  }, [])
  const [natural, setNatural] = React.useState<Size | null>(null)
  const [status, setStatus] = React.useState<ViewerStatus>('idle')
  // Changing this remounts the <img>, which is the only reliable way to make a
  // failed request run again — the browser will otherwise serve its cached
  // failure for the same URL.
  const [reloadToken, setReloadToken] = React.useState(0)

  const tickerRef = React.useRef<Ticker | null>(null)
  if (!tickerRef.current) tickerRef.current = new Ticker()
  const ticker = tickerRef.current

  const transformRef = React.useRef<Transform>(IDENTITY)
  const imageRef = React.useRef<HTMLImageElement | null>(null)
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const indexRef = React.useRef(index)
  indexRef.current = index

  // True while the transform is ours to manage. Any deliberate zoom or pan
  // hands ownership to the viewer, after which a resize must not silently
  // undo where they navigated to.
  const pristineRef = React.useRef(true)

  // Where the viewer was opened from, and whether the entry animation still
  // owes a run. Both are refs: they are read once, during a layout effect, and
  // must not schedule a render of their own.
  const originRectRef = React.useRef<DOMRect | null>(null)
  const flipPendingRef = React.useRef(false)
  const closingRef = React.useRef(false)
  // True while an animation owns the transform. The refit effect below re-runs
  // whenever geometry resolves, which lands right on top of an entry animation
  // and snaps it to its destination — so it has to know to keep its hands off.
  const animatingRef = React.useRef(false)

  const registry = React.useRef<TriggerRegistration[]>([])
  const registerTrigger = React.useCallback((reg: TriggerRegistration) => {
    registry.current.push(reg)
    return () => {
      registry.current = registry.current.filter((r) => r.id !== reg.id)
    }
  }, [])
  const indexOf = React.useCallback((id: string) => {
    const at = registry.current.findIndex((r) => r.id === id)
    return at < 0 ? 0 : at
  }, [])

  const getTriggerRect = React.useCallback(
    (at: number) => registry.current[at]?.getRect() ?? null,
    [],
  )

  const images: ImageItem[] = React.useMemo(
    () => imagesProp ?? registry.current.map((r) => r.item),
    [imagesProp],
  )
  const total = images.length

  const fitScale = React.useMemo(
    () => (natural && stageSize.width ? computeFit(natural, stageSize, transform.rotation) : 1),
    [natural, stageSize, transform.rotation],
  )
  const maxScale = React.useMemo(
    () => (natural ? computeMax(natural, transform.rotation) : 8),
    [natural, transform.rotation],
  )
  const minScale = fitScale * 0.5

  const paint = React.useCallback(() => {
    paintImage(imageRef.current, transformRef.current)
    paintTrack(trackRef.current, indexRef.current, 0)
  }, [])

  const syncTransform = React.useCallback(() => setTransform(transformRef.current), [])
  const markDirty = React.useCallback(() => {
    pristineRef.current = false
  }, [])

  /** Animate to a target and mirror it into state once it arrives. */
  const glideTo = React.useCallback(
    (target: Transform) => {
      ticker.cancelAll()
      animatingRef.current = true
      animateTransform(
        ticker,
        transformRef.current,
        target,
        (t) => {
          transformRef.current = t
          paintImage(imageRef.current, t)
        },
        () => {
          animatingRef.current = false
          syncTransform()
        },
      )
    },
    [ticker, syncTransform],
  )

  const api = React.useMemo<ViewerApi>(() => {
    const live = () => transformRef.current
    const goTo = (next: number) => {
      const target = clamp(next, 0, Math.max(0, total - 1))
      setIndex(target)
      // A new slide is framed on its own terms; carrying zoom across would open
      // it on an arbitrary crop of an image the viewer has not seen yet.
      pristineRef.current = true
      transformRef.current = { ...IDENTITY, scale: fitScale }
      setTransform(transformRef.current)
    }

    return {
      index,
      total,
      open,
      transform,
      scale: transform.scale,
      rotation: transform.rotation,
      fitScale,
      canZoomIn: transform.scale < maxScale - 1e-6,
      canZoomOut: transform.scale > minScale + 1e-6,
      canPrev: index > 0,
      canNext: index < total - 1,
      status,
      zoomTo: (scale, options) => {
        pristineRef.current = false
        const next = clamp(scale, minScale, maxScale)
        const target = zoomAbout(live(), next, options?.origin ?? { x: 0, y: 0 })
        if (options?.immediate) {
          ticker.cancelAll()
          animatingRef.current = false
          transformRef.current = target
          paintImage(imageRef.current, target)
          return
        }
        glideTo(target)
      },
      zoomBy: (factor) => {
        pristineRef.current = false
        const next = clamp(live().scale * factor, minScale, maxScale)
        glideTo(zoomAbout(live(), next, { x: 0, y: 0 }))
      },
      fit: () => {
        pristineRef.current = true
        glideTo({ ...IDENTITY, scale: fitScale, rotation: live().rotation })
      },
      actualSize: () => {
        pristineRef.current = false
        glideTo({ ...live(), scale: 1, x: 0, y: 0 })
      },
      rotate: (degrees) => {
        // Turning changes the framing, so the viewer is handed a freshly
        // fitted image rather than an arbitrary crop of the old one.
        pristineRef.current = true
        setTransform((t) => ({ ...t, rotation: t.rotation + degrees }))
        transformRef.current = { ...live(), rotation: live().rotation + degrees }
      },
      go: goTo,
      next: () => goTo(index + 1),
      prev: () => goTo(index - 1),
      close: () => {
        if (closingRef.current) return
        const target = getTriggerRect(index)
        const stageEl = imageRef.current?.closest('[data-image-view-stage]')
        const dialogEl = imageRef.current?.closest('dialog[data-image-view]')

        // Nothing to fly back to — an unmatched trigger, a reduced-motion
        // preference, or no image yet. Close outright rather than inventing a
        // destination.
        if (!target || !stageEl || !natural || prefersReducedMotion()) {
          ticker.cancelAll()
          setOpen(false)
          return
        }

        closingRef.current = true
        animatingRef.current = true
        const to = transformFromRect(target, stageEl.getBoundingClientRect(), natural, transformRef.current.rotation)
        ticker.cancelAll()
        // 3) Tell the chrome to leave at the same time as the image, rather
        // than waiting for it to land and then vanishing all at once.
        dialogEl?.setAttribute('data-closing', '')
        animateTransform(
          ticker,
          transformRef.current,
          to,
          (t) => {
            transformRef.current = t
            paintImage(imageRef.current, t)
          },
          () => {
            closingRef.current = false
            animatingRef.current = false
            dialogEl?.removeAttribute('data-closing')
            setOpen(false)
          },
          EXIT_STIFFNESS,
        )
      },
      retry: () => {
        setStatus('loading')
        setReloadToken((n) => n + 1)
      },
    }
  }, [index, total, open, transform, fitScale, minScale, maxScale, status, natural, getTriggerRect, setIndex, setOpen, glideTo, ticker])

  const internals = React.useMemo<ViewerInternals>(
    () => ({
      ticker,
      transformRef,
      imageRef,
      trackRef,
      stageSize,
      setStageSize,
      natural,
      setNatural,
      syncTransform,
      markDirty,
      setStatus,
      reloadToken,
      paint,
    }),
    [ticker, stageSize, setStageSize, natural, syncTransform, markDirty, reloadToken, paint],
  )

  // Fit whenever the framing changes underneath us — a new image arrives, the
  // window resizes, the image is turned. Only while the transform is still
  // ours: once someone has zoomed in deliberately, a resize must not throw
  // away where they were looking.
  useIsomorphicLayoutEffect(() => {
    if (!natural || !stageSize.width) return
    if (!pristineRef.current) return
    if (animatingRef.current) return
    const fitted: Transform = { ...IDENTITY, scale: fitScale, rotation: transformRef.current.rotation }

    // Entry animation. Park the image over the thumbnail first, then let it
    // travel to where it belongs. Doing this in a layout effect is what keeps
    // the fitted frame from being painted before the animation starts.
    const origin = originRectRef.current
    const stageEl = imageRef.current?.closest('[data-image-view-stage]')
    if (flipPendingRef.current && origin && stageEl) {
      flipPendingRef.current = false
      const from = transformFromRect(origin, stageEl.getBoundingClientRect(), natural, fitted.rotation)
      transformRef.current = from
      paintImage(imageRef.current, from)
      ticker.cancelAll()
      animatingRef.current = true
      animateTransform(
        ticker,
        from,
        fitted,
        (t) => {
          transformRef.current = t
          paintImage(imageRef.current, t)
        },
        () => {
          animatingRef.current = false
          syncTransform()
        },
      )
      return
    }

    if (Math.abs(transformRef.current.scale - fitScale) < 1e-6) return
    transformRef.current = fitted
    setTransform(fitted)
    paintImage(imageRef.current, fitted)
  }, [natural, stageSize, fitScale, index, open, ticker, syncTransform])

  React.useEffect(() => () => ticker.cancelAll(), [ticker])

  const openAt = React.useCallback(
    (at: number, from: DOMRect | null) => {
      originRectRef.current = from
      flipPendingRef.current = from !== null && !prefersReducedMotion()
      pristineRef.current = true
      setIndex(at)
      setOpen(true)
    },
    [setIndex, setOpen],
  )

  const value = React.useMemo<ViewerContextValue>(
    () => ({ api, images, container, internals, extensions, registerTrigger, indexOf, getTriggerRect, openAt }),
    [api, images, container, internals, extensions, registerTrigger, indexOf, getTriggerRect, openAt],
  )

  return <ViewerProvider value={value}>{children}</ViewerProvider>
}
