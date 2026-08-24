import * as React from 'react'
import { ViewerProvider, type TriggerRegistration, type ViewerContextValue } from '../context'
import type { ImageItem, ImageViewRootProps, ViewerApi } from '../../types'
import type { Transform } from '../../core/types'
import { IDENTITY, clamp, maxScale as computeMaxScale } from '../../core/transform'

function useControllable<T>(
  controlled: T | undefined,
  uncontrolled: T,
  onChange?: (value: T) => void,
): [T, (value: T) => void] {
  const [internal, setInternal] = React.useState(uncontrolled)
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
  const [fitScale, setFitScale] = React.useState(1)
  const [status] = React.useState<ViewerApi['status']>('idle')

  // Registration order stands in for index when a trigger does not supply one.
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
  const current = images[index]
  const upperScale = React.useMemo(
    () => (current?.width && current.height
      ? computeMaxScale({ width: current.width, height: current.height }, transform.rotation)
      : 8),
    [current?.width, current?.height, transform.rotation],
  )

  const api = React.useMemo<ViewerApi>(() => {
    const commit = (next: Partial<Transform>) => setTransform((t) => ({ ...t, ...next }))
    // A new slide arrives with its own framing; carrying zoom across would
    // land the viewer on an arbitrary crop of an unrelated image.
    const goTo = (next: number) => {
      setIndex(clamp(next, 0, Math.max(0, total - 1)))
      setTransform((t) => ({ ...IDENTITY, scale: fitScale, rotation: t.rotation }))
    }

    return {
      index,
      total,
      open,
      transform,
      scale: transform.scale,
      rotation: transform.rotation,
      fitScale,
      canZoomIn: transform.scale < upperScale,
      canZoomOut: transform.scale > fitScale * 0.5,
      canPrev: index > 0,
      canNext: index < total - 1,
      status,
      zoomTo: (scale) => commit({ scale: clamp(scale, fitScale * 0.5, upperScale) }),
      zoomBy: (factor) => setTransform((t) => ({ ...t, scale: clamp(t.scale * factor, fitScale * 0.5, upperScale) })),
      fit: () => setTransform({ ...IDENTITY, scale: fitScale }),
      actualSize: () => commit({ scale: 1, x: 0, y: 0 }),
      rotate: (degrees) => setTransform((t) => ({ ...t, rotation: t.rotation + degrees })),
      go: goTo,
      next: () => goTo(index + 1),
      prev: () => goTo(index - 1),
      close: () => setOpen(false),
      retry: () => undefined,
    }
  }, [index, total, open, transform, fitScale, upperScale, status, setIndex, setOpen])

  const openAt = React.useCallback(
    (at: number, _from: DOMRect | null) => {
      // `_from` is the trigger's rect, kept for the FLIP open animation.
      setIndex(at)
      setOpen(true)
    },
    [setIndex, setOpen],
  )

  const value = React.useMemo<ViewerContextValue>(
    () => ({ api, images, container, registerTrigger, indexOf, openAt }),
    [api, images, container, registerTrigger, indexOf, openAt],
  )

  // Placeholder until Stage measures itself; keeps `fit()` honest meanwhile.
  React.useEffect(() => setFitScale((s) => s), [])

  return <ViewerProvider value={value}>{children}</ViewerProvider>
}
