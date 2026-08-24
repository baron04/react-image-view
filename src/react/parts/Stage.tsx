import * as React from 'react'
import { useViewerContext } from '../context'
import { useIsomorphicLayoutEffect } from '../useIsomorphicLayoutEffect'
import { paintImage, paintTrack } from '../paint'
import { VelocityTracker } from '../../core/gesture/pointer'
import { panBounds } from '../../core/gesture/bounds'
import { animateFling, animateTransform, animateValue } from '../../core/animate'
import { fitScale as computeFit, maxScale as computeMax, IDENTITY } from '../../core/transform'
import {
  createState,
  reduce,
  type Command,
  type GestureContext,
  type GestureEvent,
  type GestureState,
} from '../../core/gesture/machine'

export interface StageProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

/**
 * The gesture host: measures itself, translates pointer events through the
 * reducer, and carries out the commands it returns.
 *
 * The two transforms it drives never interfere. Zoom and pan live on the image;
 * page position lives on the track. That is what lets the edge handoff be
 * continuous — control passing from one to the other only changes which layer
 * a frame's movement is booked against, so neither layer is ever reset
 * mid-drag.
 */
export const Stage = React.forwardRef<HTMLDivElement, StageProps>(function Stage(
  { children, style, ...rest },
  forwardedRef,
) {
  const ctx = useViewerContext('Stage')
  const { internals, api } = ctx
  const hostRef = React.useRef<HTMLDivElement | null>(null)
  const velocity = React.useRef(new VelocityTracker())
  const gesture = React.useRef<GestureState>(createState(IDENTITY))
  // A set, not a boolean: a pinch has two pointers, and collapsing them into
  // one flag meant the first finger to lift disabled the second — pinch, lift
  // one finger, and the image stopped responding to the one still down.
  const activePointers = React.useRef(new Set<number>())

  // Measure the stage. Every derived quantity — fit scale, pan bounds, the
  // distance a page drag has to cover — is relative to it.
  //
  // Measured synchronously first: ResizeObserver only reports on a later
  // frame, and waiting for it means the first frame is drawn before anything
  // knows how big the stage is.
  useIsomorphicLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    internals.setStageSize({ width: rect.width, height: rect.height })
  }, [internals])

  React.useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      internals.setStageSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [internals])

  const gestureContext = React.useCallback((): GestureContext => {
    const natural = internals.natural ?? { width: 1, height: 1 }
    const stage = internals.stageSize
    const transform = internals.transformRef.current
    const fit = stage.width ? computeFit(natural, stage, transform.rotation) : 1
    return {
      stage,
      natural,
      transform,
      fitScale: fit,
      minScale: fit * 0.5,
      maxScale: computeMax(natural, transform.rotation),
      canPrev: api.canPrev,
      canNext: api.canNext,
    }
  }, [internals, api.canPrev, api.canNext])

  const runCommands = React.useCallback(
    (commands: Command[], gctx: GestureContext) => {
      for (const command of commands) {
        switch (command.type) {
          case 'cancelAnimations':
            // A finger down outranks any motion in flight, and taking over
            // also takes ownership back from whatever was animating.
            internals.ticker.cancelAll()
            internals.markDirty()
            break

          case 'settle':
            animateTransform(
              internals.ticker,
              internals.transformRef.current,
              command.target,
              (t) => {
                internals.transformRef.current = t
                paintImage(internals.imageRef.current, t)
              },
              internals.syncTransform,
            )
            break

          case 'flingPan': {
            const bounds = panBounds(gctx.natural, gctx.stage, internals.transformRef.current)
            animateFling(
              internals.ticker,
              internals.transformRef.current,
              command.velocity,
              bounds,
              (t) => {
                internals.transformRef.current = t
                paintImage(internals.imageRef.current, t)
              },
              internals.syncTransform,
            )
            break
          }

          case 'page':
            // The track is already displaced by the drag; committing the index
            // lets it re-render at rest on the new slide.
            if (command.direction > 0) api.next()
            else api.prev()
            paintTrack(internals.trackRef.current, api.index + command.direction, 0)
            break

          case 'snapBack':
            animateValue(
              internals.ticker,
              gesture.current.trackOffset,
              0,
              (offset) => paintTrack(internals.trackRef.current, api.index, offset),
            )
            break

          case 'dismiss':
            api.close()
            break

          case 'cancelDismiss':
            break
        }
      }
    },
    [internals, api],
  )

  const dispatch = React.useCallback(
    (event: GestureEvent) => {
      const gctx = gestureContext()
      const result = reduce(gesture.current, event, gctx)
      gesture.current = result.state

      // Paint straight from the ref. Going through state here would cost a
      // re-render of the whole subtree on every pointermove.
      internals.transformRef.current = result.state.transform
      paintImage(internals.imageRef.current, result.state.transform)
      paintTrack(internals.trackRef.current, api.index, result.state.trackOffset)

      // Written imperatively for the same reason the transform is: the phase
      // changes mid-drag, when nothing re-renders. Exposing it makes the
      // gesture observable from the outside — to CSS, and to a test driving
      // real pointer events.
      hostRef.current?.setAttribute('data-phase', result.state.phase)

      runCommands(result.commands, gctx)
    },
    [gestureContext, internals, api.index, runCommands],
  )

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Capture so the gesture survives the pointer leaving the element — letting
    // a drag die at the edge of the stage is a common and very annoying bug.
    // It throws if the pointer is already gone, which is not worth losing the
    // gesture over.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* capture is an optimisation, not a requirement */
    }
    activePointers.current.add(event.pointerId)
    internals.markDirty()
    velocity.current.reset()
    velocity.current.add(event.clientX, event.clientY)
    dispatch({ type: 'pointerdown', id: event.pointerId, x: event.clientX, y: event.clientY })
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(event.pointerId)) return
    velocity.current.add(event.clientX, event.clientY)
    dispatch({ type: 'pointermove', id: event.pointerId, x: event.clientX, y: event.clientY })
  }

  const endPointer = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (!activePointers.current.delete(event.pointerId)) return
    dispatch(
      cancelled
        ? { type: 'pointercancel', id: event.pointerId }
        : { type: 'pointerup', id: event.pointerId, velocity: velocity.current.velocity() },
    )
    // Only once the last finger is up is the gesture actually over; syncing
    // mid-pinch would publish a transform that is still moving.
    if (activePointers.current.size === 0) {
      velocity.current.reset()
      internals.syncTransform()
    }
  }

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const gctx = gestureContext()
    const rect = hostRef.current?.getBoundingClientRect()
    if (!rect) return
    event.preventDefault()
    // Trackpad pinch arrives as a wheel event with ctrlKey set; a plain wheel
    // is a mouse, which wants coarser steps.
    const factor = event.ctrlKey ? 1 - event.deltaY * 0.01 : event.deltaY < 0 ? 1.15 : 1 / 1.15
    api.zoomTo(gctx.transform.scale * factor, {
      origin: {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      },
    })
  }

  return (
    <div
      {...rest}
      ref={(node) => {
        hostRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }}
      data-image-view-stage=""
      data-phase="idle"
      // The browser's own panning and zooming would fight ours for the same
      // pointer stream; we take the whole stream and do it all ourselves.
      style={{ touchAction: 'none', overscrollBehavior: 'contain', ...style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endPointer(e, false)}
      onPointerCancel={(e) => endPointer(e, true)}
      onWheel={onWheel}
    >
      {children}
    </div>
  )
})
