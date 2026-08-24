import * as React from 'react'
import { ViewerProvider, type TriggerRegistration, type ViewerContextValue, type ViewerInternals } from '../context'
import type { ImageItem, ImageViewRootProps, ViewerApi } from '../../types'
import type { Size, Transform } from '../../core/types'
import { IDENTITY, clamp, fitScale as computeFit, maxScale as computeMax, zoomAbout } from '../../core/transform'
import { Ticker } from '../../core/ticker'
import { animateTransform } from '../../core/animate'
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
      animateTransform(
        ticker,
        transformRef.current,
        target,
        (t) => {
          transformRef.current = t
          paintImage(imageRef.current, t)
        },
        syncTransform,
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
      status: 'idle',
      zoomTo: (scale, options) => {
        pristineRef.current = false
        const next = clamp(scale, minScale, maxScale)
        glideTo(zoomAbout(live(), next, options?.origin ?? { x: 0, y: 0 }))
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
        ticker.cancelAll()
        setOpen(false)
      },
      retry: () => setNatural(null),
    }
  }, [index, total, open, transform, fitScale, minScale, maxScale, setIndex, setOpen, glideTo, ticker])

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
      paint,
    }),
    [ticker, stageSize, setStageSize, natural, syncTransform, markDirty, paint],
  )

  // Fit whenever the framing changes underneath us — a new image arrives, the
  // window resizes, the image is turned. Only while the transform is still
  // ours: once someone has zoomed in deliberately, a resize must not throw
  // away where they were looking.
  useIsomorphicLayoutEffect(() => {
    if (!natural || !stageSize.width) return
    if (!pristineRef.current) return
    if (Math.abs(transformRef.current.scale - fitScale) < 1e-6) return
    transformRef.current = { ...IDENTITY, scale: fitScale, rotation: transformRef.current.rotation }
    setTransform(transformRef.current)
    paintImage(imageRef.current, transformRef.current)
  }, [natural, stageSize, fitScale, index, open])

  React.useEffect(() => () => ticker.cancelAll(), [ticker])

  const openAt = React.useCallback(
    (at: number, _from: DOMRect | null) => {
      // `_from` is the trigger's rect, kept for the FLIP open animation.
      setIndex(at)
      setOpen(true)
    },
    [setIndex, setOpen],
  )

  const value = React.useMemo<ViewerContextValue>(
    () => ({ api, images, container, internals, registerTrigger, indexOf, openAt }),
    [api, images, container, internals, registerTrigger, indexOf, openAt],
  )

  return <ViewerProvider value={value}>{children}</ViewerProvider>
}
