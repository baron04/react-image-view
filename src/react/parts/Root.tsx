import * as React from 'react'
import { ViewerProvider, type TriggerRegistration, type ViewerContextValue, type ViewerInternals } from '../context'
import type { ImageItem, ImageViewRootProps, ViewerApi, ViewerStatus } from '../../types'
import type { Size, SlideSize, Transform } from '../../core/types'
import { IDENTITY, clamp, fitScale as computeFit, maxScale as computeMax, zoomAbout } from '../../core/transform'
import { Ticker } from '../../core/ticker'
import { animateTransform } from '../../core/animate'
import { prefersReducedMotion, transformFromRect } from '../../core/flip'
import { tuning } from '../../core/tuning'

// See ../../core/tuning: exits run far stiffer than entrances on purpose.
const EXIT_STIFFNESS = tuning.spring.exitStiffness
import { paintImage, paintTrack } from '../paint'
import { Content } from './Content'
import { DefaultContent } from '../../preset/DefaultContent'
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
  const [natural, setNatural] = React.useState<SlideSize | null>(null)
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

  /**
   * Stop every animation and hand ownership of the transform back.
   *
   * Cancelling a ticker entry does not run its completion callback, so
   * clearing the ticker alone left `animatingRef` stuck on: after any
   * interrupted animation the refit below would bail forever, and a turned
   * page kept the previous image's scale.
   *
   * Deliberately does not publish state. Doing so from inside a layout effect
   * re-entered that same effect before it had finished setting up, and the
   * second pass overwrote the entry animation's starting frame. Callers that
   * need the controls updated call `syncTransform` themselves.
   */
  const stopAnimations = React.useCallback(() => {
    ticker.cancelAll()
    animatingRef.current = false
  }, [ticker])
  const markDirty = React.useCallback(() => {
    pristineRef.current = false
  }, [])

  /** Animate to a target and mirror it into state once it arrives. */
  const glideTo = React.useCallback(
    (target: Transform) => {
      stopAnimations()
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
    [ticker, stopAnimations, syncTransform],
  )

  const api = React.useMemo<ViewerApi>(() => {
    const live = () => transformRef.current
    const goTo = (next: number) => {
      const target = clamp(next, 0, Math.max(0, total - 1))
      setIndex(target)
      // A new slide is framed on its own terms; carrying zoom across would open
      // it on an arbitrary crop of an image the viewer has not seen yet.
      pristineRef.current = true
      // A slide change ends any claim the entry animation had.
      flipPendingRef.current = false

      // Size the incoming slide from its own dimensions, here and now.
      //
      // Leaving it on the outgoing slide's scale and waiting for the refit
      // effect to correct it means the new image is painted at the wrong size
      // first — which is a visible pop at best, and if anything interrupts the
      // correction the image just stays wrong. Where dimensions were declared
      // this needs no measurement at all.
      const incoming = images[target]
      const nextScale =
        incoming?.width && incoming.height && stageSize.width
          ? computeFit({ width: incoming.width, height: incoming.height }, stageSize)
          : fitScale
      transformRef.current = { ...IDENTITY, scale: nextScale }
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
          stopAnimations()
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
          stopAnimations()
          setOpen(false)
          return
        }

        const to = transformFromRect(target, stageEl.getBoundingClientRect(), natural, transformRef.current.rotation)
        stopAnimations()
        closingRef.current = true
        animatingRef.current = true
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
  }, [index, total, open, transform, fitScale, minScale, maxScale, status, natural, images, stageSize, getTriggerRect, setIndex, setOpen, glideTo, stopAnimations, ticker])

  const internals = React.useMemo<ViewerInternals>(
    () => ({
      ticker,
      transformRef,
      imageRef,
      trackRef,
      indexRef,
      stageSize,
      setStageSize,
      natural,
      setNatural,
      syncTransform,
      markDirty,
      stopAnimations,
      setStatus,
      reloadToken,
      paint,
    }),
    [ticker, stageSize, setStageSize, natural, syncTransform, markDirty, stopAnimations, reloadToken, paint],
  )

  /**
   * Entry animation, in its own effect and nothing else's business.
   *
   * It used to live inside the refit below, where the two fought: refit re-runs
   * whenever geometry resolves, which is exactly while the entry animation is
   * getting started, and each pass could undo the other. Splitting them makes
   * the ordering trivial — this claims the transform, and refit steps aside
   * for anything that has claimed it.
   */
  useIsomorphicLayoutEffect(() => {
    if (!flipPendingRef.current) return
    if (!open) {
      flipPendingRef.current = false
      return
    }
    // Geometry is not ready yet; keep the claim and wait for the next pass.
    if (!natural || !stageSize.width) return

    const origin = originRectRef.current
    const stageEl = imageRef.current?.closest('[data-image-view-stage]')
    flipPendingRef.current = false
    if (!origin || !stageEl) return

    const fitted: Transform = { ...IDENTITY, scale: fitScale, rotation: transformRef.current.rotation }
    const from = transformFromRect(origin, stageEl.getBoundingClientRect(), natural, fitted.rotation)

    stopAnimations()
    animatingRef.current = true
    transformRef.current = from
    paintImage(imageRef.current, from)

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
  }, [open, natural, stageSize, fitScale, ticker, stopAnimations, syncTransform])

  // Which slide the current framing was computed for. A slide change always
  // re-frames, whatever else is going on.
  const framedForRef = React.useRef<number | null>(null)

  /**
   * Fit whenever the framing changes underneath us — a new image arrives, the
   * window resizes, the image is turned.
   *
   * A *slide change* overrides every guard. Those guards exist to protect a
   * deliberate zoom from being undone by a resize, but they have no business
   * on a new image: it has its own dimensions and has never been looked at.
   * Letting them apply is what left a turned page wearing the previous
   * image's scale whenever anything happened to be mid-flight.
   */
  useIsomorphicLayoutEffect(() => {
    if (!natural || !stageSize.width) return
    // The entry animation gets first claim on the opening frame.
    if (flipPendingRef.current) return
    // Dimensions for a slide we have already left; reframing on them is what
    // put the previous image's scale on the new one.
    if (natural.forIndex !== index) return

    const slideChanged = framedForRef.current !== index
    if (!slideChanged) {
      if (!pristineRef.current) return
      if (animatingRef.current) return
    } else {
      // A new slide invalidates anything animating the old one.
      stopAnimations()
      pristineRef.current = true
    }

    framedForRef.current = index
    if (Math.abs(transformRef.current.scale - fitScale) < 1e-6) return

    const fitted: Transform = { ...IDENTITY, scale: fitScale, rotation: transformRef.current.rotation }
    transformRef.current = fitted
    setTransform(fitted)
    paintImage(imageRef.current, fitted)
  }, [natural, stageSize, fitScale, index, open, stopAnimations])

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

  // L2 falls out of L3 rather than being a separate path: if the caller
  // already placed a <Content> — or a <DefaultContent> configured
  // differently, e.g. with the thumbnail strip on — this is a full
  // composition and nothing more is added. Otherwise the reviewed default is
  // appended, so `<Root><Trigger/>...</Root>` with no further markup is a
  // complete, styled viewer — the "multi-image, shared preview" tier the
  // architecture doc describes.
  const hasContent = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && (child.type === Content || child.type === DefaultContent),
  )

  return (
    <ViewerProvider value={value}>
      {children}
      {!hasContent && <DefaultContent />}
    </ViewerProvider>
  )
}
