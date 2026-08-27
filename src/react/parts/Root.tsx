import * as React from 'react'
import { ViewerProvider, type TriggerGeometry, type TriggerRegistration, type ViewerContextValue, type ViewerInternals } from '../context'
import type { ImageItem, ImageViewRootProps, ViewerApi, ViewerLabels, ViewerStatus } from '../../types'
import type { Size, SlideSize, Transform } from '../../core/types'
import type { Crop, FlipFrame } from '../../core/flip'
import { IDENTITY, clamp, fitScale as computeFit, maxScale as computeMax, zoomAbout } from '../../core/transform'
import { Ticker } from '../../core/ticker'
import { animateFlipFrame, animateTransform } from '../../core/animate'
import { NO_CROP, fittedFlipFrame, flipFrameFromRect, prefersReducedMotion } from '../../core/flip'
import { tuning } from '../../core/tuning'
import { en, labelsForLocale, mergeLabels } from '../../labels'
import { paintCrop, paintImage, paintTrack } from '../paint'
import { Content } from './Content'
import { DefaultContent } from '../../preset/DefaultContent'
import { useIsomorphicLayoutEffect } from '../useIsomorphicLayoutEffect'

// See ../../core/tuning: exits run far stiffer than entrances on purpose.
const EXIT_STIFFNESS = tuning.spring.exitStiffness

// The browser's language cannot change without a reload, so there is nothing
// to subscribe to — but the store contract requires a subscribe function.
const subscribeNever = () => () => {}
let cached: ViewerLabels | undefined
const clientLabels = () => (cached ??= labelsForLocale(navigator.language))
const serverLabels = () => en

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
  labels: labelsProp,
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
  // Follows the browser's language among the packs this package ships, and
  // only when the caller has not pinned `labels` themselves.
  //
  // `useSyncExternalStore` rather than reading `navigator` during render: the
  // server has no `navigator`, so a client that resolved Chinese while the
  // server had emitted English would mismatch on every aria-label it
  // hydrated. Giving the two sides an explicit snapshot each is what the API
  // is for. `clientLabels` caches, so the snapshot is reference-stable and
  // the store never re-fires.
  const detected = React.useSyncExternalStore(subscribeNever, clientLabels, serverLabels)
  const labels = React.useMemo(
    () => mergeLabels(detected, labelsProp),
    [detected, labelsProp],
  )
  const [natural, setNaturalState] = React.useState<SlideSize | null>(null)
  // Image.tsx calls this on every layout pass that touches the current slide,
  // not only when the size actually changed — republishing a same-valued but
  // new object on every one of those passes fed back through `fitScale` and
  // the effects keyed on `natural`, which is exactly the kind of loop
  // `setStageSize` above already guards against.
  const setNatural = React.useCallback((next: SlideSize | null) => {
    setNaturalState((prev) =>
      prev === next ||
      (prev !== null &&
        next !== null &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.forIndex === next.forIndex)
        ? prev
        : next,
    )
  }, [])
  const [status, setStatus] = React.useState<ViewerStatus>('idle')
  // Changing this remounts the <img>, which is the only reliable way to make a
  // failed request run again — the browser will otherwise serve its cached
  // failure for the same URL.
  const [reloadToken, setReloadToken] = React.useState(0)

  const tickerRef = React.useRef<Ticker | null>(null)
  // The `=== null` form (rather than a truthy check) is what the lint rule
  // recognises as the safe "lazy-init a ref" shape it documents: it can
  // prove this branch runs exactly once per instance, ever.
  if (tickerRef.current === null) tickerRef.current = new Ticker()
  // The rule only recognises the init line above as safe, not this read
  // right after it — but by construction tickerRef.current can never be
  // null here.
  // eslint-disable-next-line react-hooks/refs -- see comment above
  const ticker = tickerRef.current

  const transformRef = React.useRef<Transform>(IDENTITY)
  const imageRef = React.useRef<HTMLImageElement | null>(null)
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  // Kept in sync via a layout effect rather than written directly here —
  // writing during render is exactly what this ref exists to avoid needing
  // (reading the latest index from an event handler without retriggering
  // whatever effect captured it), so it should not do the one thing it is
  // meant to route around.
  const indexRef = React.useRef(index)
  useIsomorphicLayoutEffect(() => {
    indexRef.current = index
  }, [index])

  // True while the transform is ours to manage. Any deliberate zoom or pan
  // hands ownership to the viewer, after which a resize must not silently
  // undo where they navigated to.
  const pristineRef = React.useRef(true)

  // Where the viewer was opened from, and whether the entry animation still
  // owes a run. Both are refs: they are read once, during a layout effect, and
  // must not schedule a render of their own.
  const originGeometryRef = React.useRef<TriggerGeometry | null>(null)
  const flipPendingRef = React.useRef(false)
  const closingRef = React.useRef(false)
  // The crop currently applied for a `cover`-fit FLIP flight — see
  // core/flip.ts. Mirrors transformRef: authoritative during a gesture-free
  // flight, painted straight to the DOM, and always reset to NO_CROP the
  // moment anything takes the transform away from the flight (see
  // stopAnimations below) — an interrupted flight must never leave the image
  // visibly cropped once the user is just looking at or dragging it normally.
  const cropRef = React.useRef<Crop>(NO_CROP)
  // True while an animation owns the transform. The refit effect below re-runs
  // whenever geometry resolves, which lands right on top of an entry animation
  // and snaps it to its destination — so it has to know to keep its hands off.
  const animatingRef = React.useRef(false)

  const registry = React.useRef<TriggerRegistration[]>([])
  // Bumped on every register/unregister so the `images` memo below actually
  // recomputes when the L2 "derive images from registered Triggers" path is
  // in play (no `images` prop given). Registering by itself was not state,
  // so nothing ever re-rendered Root to pick up a newly mounted Trigger —
  // `images`/`total` would silently stay at whatever they were on first
  // render. Every real usage in this codebase passes `images` explicitly and
  // never hit this, which is exactly how it went unnoticed.
  const [registryVersion, setRegistryVersion] = React.useState(0)
  const registerTrigger = React.useCallback((reg: TriggerRegistration) => {
    registry.current.push(reg)
    setRegistryVersion((v) => v + 1)
    return () => {
      registry.current = registry.current.filter((r) => r.id !== reg.id)
      setRegistryVersion((v) => v + 1)
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

  // Reads registry.current during render on purpose — this is the L2
  // fallback's only source of truth, and registryVersion is exactly what
  // makes that safe: it is bumped synchronously (in the same commit)
  // whenever the ref's contents change, so this memo is never looking at a
  // stale snapshot the way an uncoordinated ref read would be. It has to
  // stay in the dependency array below for that guarantee to mean anything,
  // even though the linter can't see it being read inside the callback body.
  const images: ImageItem[] = React.useMemo(
    // eslint-disable-next-line react-hooks/refs -- see comment above
    () => imagesProp ?? registry.current.map((r) => r.item),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
    [imagesProp, registryVersion],
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
    // A flight cut short must not leave the image looking cropped once
    // gestures or a plain zoom take over — those never touch crop themselves.
    if (cropRef.current !== NO_CROP) {
      cropRef.current = NO_CROP
      paintCrop(imageRef.current, NO_CROP)
    }
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
        const target = getTriggerGeometry(index)
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

        const rotation = transformRef.current.rotation
        const from: FlipFrame = { transform: transformRef.current, crop: cropRef.current }
        stopAnimations()
        closingRef.current = true
        animatingRef.current = true

        // Tell the chrome to leave at the same time as the image, rather than
        // waiting for it to land and then vanishing all at once.
        //
        // This has to happen *before* the stage is measured. `[data-closing]`
        // sets `display: none` on the header and toolbar, which reflows the
        // dialog's column: the stage grows by the header's height and the
        // centred image shifts up by half of it. Measuring first meant the
        // whole flight was computed against a layout that no longer existed by
        // the time it ran — off by ~24px for its entire length, and correct
        // only on the final frame, when removing the attribute restored the
        // layout the numbers had assumed. That read as the image settling too
        // high and then snapping into place.
        dialogEl?.setAttribute('data-closing', '')

        // Reading a rect right after the attribute write forces the layout to
        // flush, so this sees the post-`data-closing` geometry the flight will
        // actually run in.
        const to = flipFrameFromRect(
          target.rect,
          stageEl.getBoundingClientRect(),
          natural,
          rotation,
          target.fit,
        )
        animateFlipFrame(
          ticker,
          from,
          to,
          (frame) => {
            transformRef.current = frame.transform
            cropRef.current = frame.crop
            paintImage(imageRef.current, frame.transform)
            paintCrop(imageRef.current, frame.crop)
          },
          () => {
            closingRef.current = false
            animatingRef.current = false
            setOpen(false)

            // Deliberately not removed before the unmount. Taking
            // `[data-closing]` off puts the header and toolbar back, which
            // reflows the column and drops the centred image by half the
            // header's height — so the flight that had just landed exactly on
            // the thumbnail jumped downward for the one frame between the
            // restore and React removing the dialog.
            //
            // Unmounting takes the attribute with it, so the only case that
            // still needs it cleared is a controlled `open` that declined to
            // close and left the dialog mounted.
            requestAnimationFrame(() => {
              if (dialogEl?.isConnected) dialogEl.removeAttribute('data-closing')
            })
          },
          EXIT_STIFFNESS,
        )
      },
      retry: () => {
        setStatus('loading')
        setReloadToken((n) => n + 1)
      },
    }
  }, [index, total, open, transform, fitScale, minScale, maxScale, status, natural, images, stageSize, getTriggerGeometry, setIndex, setOpen, glideTo, stopAnimations, ticker])

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
    [ticker, stageSize, setStageSize, natural, setNatural, syncTransform, markDirty, stopAnimations, reloadToken, paint],
  )

  // Which slide the current framing was computed for. A slide change always
  // re-frames, whatever else is going on.
  const framedForRef = React.useRef<number | null>(null)

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

    const origin = originGeometryRef.current
    const stageEl = imageRef.current?.closest('[data-image-view-stage]')
    flipPendingRef.current = false
    if (!origin || !stageEl) return

    const rotation = transformRef.current.rotation
    const target = fittedFlipFrame(fitScale, rotation)
    const from = flipFrameFromRect(origin.rect, stageEl.getBoundingClientRect(), natural, rotation, origin.fit)

    stopAnimations()
    animatingRef.current = true

    // Claim the framing for this slide before handing off to the ticker.
    //
    // The refit effect below treats `framedForRef.current !== index` as a
    // slide change, and a slide change deliberately overrides every guard —
    // including `animatingRef`. On the first open that comparison is
    // `null !== 0`, so refit read the entry flight as a page turn, cancelled
    // it, and snapped straight to the fitted scale in the same commit. The
    // flight started and was erased before a single frame was painted, which
    // is why opening appeared instant while closing animated normally.
    //
    // This *is* the framing for this slide, so say so.
    framedForRef.current = index

    transformRef.current = from.transform
    cropRef.current = from.crop
    paintImage(imageRef.current, from.transform)
    paintCrop(imageRef.current, from.crop)

    animateFlipFrame(
      ticker,
      from,
      target,
      (frame) => {
        transformRef.current = frame.transform
        cropRef.current = frame.crop
        paintImage(imageRef.current, frame.transform)
        paintCrop(imageRef.current, frame.crop)
      },
      () => {
        animatingRef.current = false
        syncTransform()
      },
    )
    // Every ref access above runs either synchronously inside this layout
    // effect's own body, or inside animateFlipFrame's frame/completion
    // callbacks — which fire later, on animation frames, never during a
    // render. useIsomorphicLayoutEffect is `React.useLayoutEffect` itself
    // behind a plain variable, not a wrapper the plugin's static analysis
    // can see through, which is why it doesn't recognise this as an effect.
    // eslint-disable-next-line react-hooks/refs -- see comment above
  }, [open, index, natural, stageSize, fitScale, ticker, stopAnimations, syncTransform])

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
    (at: number, from: TriggerGeometry | null) => {
      originGeometryRef.current = from
      flipPendingRef.current = from !== null && !prefersReducedMotion()
      pristineRef.current = true
      setIndex(at)
      setOpen(true)
    },
    [setIndex, setOpen],
  )

  // `internals` carries raw ref objects (transformRef, imageRef, ticker…) out
  // through context so Stage/Image/etc. can read and write `.current` from
  // their own effects and event handlers without a prop-drilled setter per
  // ref. Handing the *objects* through render is fine — nothing here
  // dereferences `.current`; every consumer of `internals` only ever does
  // that outside its own render, same rule this file follows everywhere
  // else. The lint rule can't see across the component boundary to confirm
  // that, hence the two disables below rather than a false "fixed" render
  // read.
  const value = React.useMemo<ViewerContextValue>(
    // eslint-disable-next-line react-hooks/refs -- see comment above
    () => ({ api, images, container, internals, extensions, labels, registerTrigger, indexOf, getTriggerGeometry, openAt }),
    [api, images, container, internals, extensions, labels, registerTrigger, indexOf, getTriggerGeometry, openAt],
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
    // Same as the `value` memo above: `value` carries ref objects, not
    // dereferenced ref values, out through context.
    // eslint-disable-next-line react-hooks/refs -- see the `value` memo's comment
    <ViewerProvider value={value}>
      {children}
      {!hasContent && <DefaultContent />}
    </ViewerProvider>
  )
}
