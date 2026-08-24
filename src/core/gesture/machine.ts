import type { Point, Size, Transform } from '../types'
import { clamp, orientedSize, zoomAbout } from '../transform'
import { panBounds, remainingIn, rubberBand } from './bounds'

export type GesturePhase =
  /** Nothing in flight. */
  | 'idle'
  /** One pointer down, intent not yet determined. */
  | 'tracking'
  /** Dragging a zoomed image around. */
  | 'panning'
  /** Dragging horizontally between slides. */
  | 'paging'
  /** Dragging down to dismiss; only ever entered at fit scale. */
  | 'dismissing'
  /** Two pointers down. */
  | 'pinching'

/** Movement before a single-pointer drag commits to an axis. */
export const INTENT_THRESHOLD = 8

/**
 * Overshoot past a pan edge before control passes to the pager. Large enough
 * that a pan ending at the edge does not turn the page by accident, small
 * enough that deliberately continuing feels like one motion.
 *
 * A starting value, not a conclusion — this wants tuning on real hardware.
 */
export const HANDOFF_THRESHOLD = 40

/** Fraction of the stage a page drag must cover to commit on release. */
export const PAGE_COMMIT_RATIO = 0.5
/** …or this flick speed, in px/ms, which commits regardless of distance. */
export const PAGE_COMMIT_VELOCITY = 0.4

export const DISMISS_COMMIT_RATIO = 0.25
export const DISMISS_COMMIT_VELOCITY = 0.5

export interface ActivePointer {
  id: number
  x: number
  y: number
  startX: number
  startY: number
}

export interface GestureContext {
  stage: Size
  natural: Size
  /** Transform in effect when the gesture began. */
  transform: Transform
  fitScale: number
  minScale: number
  maxScale: number
  canPrev: boolean
  canNext: boolean
}

export interface GestureState {
  phase: GesturePhase
  pointers: ActivePointer[]
  /** Transform at the moment the current phase was entered. */
  startTransform: Transform
  /** Live transform — what the binding should paint. */
  transform: Transform
  /** Horizontal track displacement in px. Non-zero only while paging. */
  trackOffset: number
  /** Movement accumulated past a pan edge; carried into the pager on handoff. */
  overshoot: number
  /**
   * Drag distance already spent on panning before the pager took over.
   *
   * Without it the pager would read the whole gesture delta, including the
   * part that merely moved the image to its edge, and the track would jump by
   * that much the instant control changed hands — the exact seam the handoff
   * exists to avoid.
   */
  pageBase: number
  /** Vertical progress of a dismiss drag, 0..1, for backdrop opacity. */
  dismissProgress: number
  pinch: { startDistance: number; startScale: number } | null
}

export type GestureEvent =
  | { type: 'pointerdown'; id: number; x: number; y: number }
  | { type: 'pointermove'; id: number; x: number; y: number }
  /**
   * Velocity is supplied by the binding rather than derived here. It needs a
   * timed sample window, and keeping clocks out of the reducer is what lets
   * the whole machine be tested by replaying synthetic events.
   */
  | { type: 'pointerup'; id: number; velocity?: Point }
  | { type: 'pointercancel'; id: number }

export type Command =
  /** Stop every running animation — a finger down always outranks motion. */
  | { type: 'cancelAnimations' }
  /** Spring the image back to `target`. */
  | { type: 'settle'; target: Transform }
  /** Carry the pan on with inertia, then clamp into bounds. */
  | { type: 'flingPan'; velocity: Point }
  /** Commit a page change in `direction`. */
  | { type: 'page'; direction: -1 | 1 }
  /** Return the track to rest without changing page. */
  | { type: 'snapBack' }
  | { type: 'dismiss' }
  | { type: 'cancelDismiss' }

export function createState(transform: Transform): GestureState {
  return {
    phase: 'idle',
    pointers: [],
    startTransform: transform,
    transform,
    trackOffset: 0,
    overshoot: 0,
    pageBase: 0,
    dismissProgress: 0,
    pinch: null,
  }
}

function distanceBetween(a: ActivePointer, b: ActivePointer): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midpointOf(a: ActivePointer, b: ActivePointer): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function totalDelta(pointers: ActivePointer[]): Point {
  const p = pointers[0]
  if (!p) return { x: 0, y: 0 }
  return { x: p.x - p.startX, y: p.y - p.startY }
}

/**
 * Which phase an undecided drag becomes.
 *
 * A zoomed image always pans first. Page turns are reached only through the
 * handoff below, never chosen up front, so panning can never lose to an eager
 * pager on an image that still has room to move.
 */
export function resolveIntent(delta: Point, ctx: GestureContext): GesturePhase {
  if (ctx.transform.scale > ctx.fitScale + 1e-6) return 'panning'
  const ax = Math.abs(delta.x)
  const ay = Math.abs(delta.y)
  if (ax < INTENT_THRESHOLD && ay < INTENT_THRESHOLD) return 'tracking'
  return ax > ay ? 'paging' : 'dismissing'
}

/** Is a page turn in this direction possible at all? */
function canPage(direction: -1 | 1, ctx: GestureContext): boolean {
  return direction < 0 ? ctx.canPrev : ctx.canNext
}

export function reduce(
  state: GestureState,
  event: GestureEvent,
  ctx: GestureContext,
): { state: GestureState; commands: Command[] } {
  switch (event.type) {
    case 'pointerdown': {
      const pointers = [
        ...state.pointers,
        { id: event.id, x: event.x, y: event.y, startX: event.x, startY: event.y },
      ]

      if (pointers.length === 1) {
        return {
          state: {
            ...state,
            phase: 'tracking',
            pointers,
            startTransform: ctx.transform,
            transform: ctx.transform,
            overshoot: 0,
            pageBase: 0,
            dismissProgress: 0,
          },
          commands: [{ type: 'cancelAnimations' }],
        }
      }

      const [a, b] = pointers
      if (pointers.length === 2 && a && b) {
        return {
          state: {
            ...state,
            phase: 'pinching',
            pointers,
            startTransform: state.transform,
            pinch: { startDistance: distanceBetween(a, b), startScale: state.transform.scale },
          },
          commands: [{ type: 'cancelAnimations' }],
        }
      }

      // A third finger is noise here; track it so bookkeeping stays right.
      return { state: { ...state, pointers }, commands: [] }
    }

    case 'pointermove': {
      const pointers = state.pointers.map((p) =>
        p.id === event.id ? { ...p, x: event.x, y: event.y } : p,
      )
      const next = { ...state, pointers }

      if (next.phase === 'pinching') return { state: applyPinch(next, ctx), commands: [] }
      if (next.phase === 'tracking') {
        const resolved = resolveIntent(totalDelta(pointers), ctx)
        if (resolved === 'tracking') return { state: next, commands: [] }
        return { state: applyDrag({ ...next, phase: resolved }, ctx), commands: [] }
      }
      if (next.phase === 'idle') return { state: next, commands: [] }

      return { state: applyDrag(next, ctx), commands: [] }
    }

    case 'pointerup':
    case 'pointercancel': {
      const pointers = state.pointers.filter((p) => p.id !== event.id)

      // Lifting one finger out of a pinch continues as a pan with the other,
      // rather than dropping the gesture — the hand is still on the image.
      if (state.phase === 'pinching' && pointers.length === 1) {
        const remaining = pointers[0]!
        return {
          state: {
            ...state,
            phase: 'panning',
            pointers: [{ ...remaining, startX: remaining.x, startY: remaining.y }],
            startTransform: state.transform,
            pinch: null,
            overshoot: 0,
          },
          commands: [],
        }
      }

      if (pointers.length > 0) return { state: { ...state, pointers }, commands: [] }

      const velocity = event.type === 'pointerup' ? (event.velocity ?? { x: 0, y: 0 }) : { x: 0, y: 0 }
      return release({ ...state, pointers }, velocity, ctx)
    }
  }
}

function applyPinch(state: GestureState, ctx: GestureContext): GestureState {
  const [a, b] = state.pointers
  if (!a || !b || !state.pinch) return state

  const ratio = distanceBetween(a, b) / (state.pinch.startDistance || 1)
  const scale = clamp(state.pinch.startScale * ratio, ctx.minScale, ctx.maxScale)
  const mid = midpointOf(a, b)
  const origin = { x: mid.x - ctx.stage.width / 2, y: mid.y - ctx.stage.height / 2 }

  return { ...state, transform: zoomAbout(state.startTransform, scale, origin) }
}

function applyDrag(state: GestureState, ctx: GestureContext): GestureState {
  const delta = totalDelta(state.pointers)

  if (state.phase === 'dismissing') {
    const progress = clamp(Math.abs(delta.y) / (ctx.stage.height * DISMISS_COMMIT_RATIO), 0, 1)
    return {
      ...state,
      transform: { ...state.startTransform, y: state.startTransform.y + delta.y },
      dismissProgress: progress,
    }
  }

  if (state.phase === 'paging') {
    // Only the movement since the pager took over counts. After a handoff
    // `pageBase` holds what the pan already consumed.
    const travel = delta.x - state.pageBase
    const direction: -1 | 1 = travel < 0 ? 1 : -1
    // Resisting at the ends of the set makes the boundary legible instead of
    // looking like a dropped frame.
    const offset = canPage(direction, ctx) ? travel : rubberBand(travel, ctx.stage.width)
    return { ...state, trackOffset: offset }
  }

  // panning
  const bounds = panBounds(ctx.natural, ctx.stage, state.startTransform)
  const wantX = state.startTransform.x + delta.x
  const wantY = state.startTransform.y + delta.y
  const direction: -1 | 1 = delta.x > 0 ? 1 : -1
  const remainingX = remainingIn(state.startTransform.x, bounds, 'x', direction)

  const overX = Math.abs(delta.x) - remainingX
  const atEdge = overX > 0

  if (atEdge && canPage(delta.x > 0 ? -1 : 1, ctx)) {
    const overshoot = Math.sign(delta.x) * overX

    // The handoff. Control moves to the pager, and `overshoot` moves with it as
    // the pager's starting displacement — restarting from zero is exactly what
    // would be felt as a stutter mid-drag.
    if (Math.abs(overshoot) > HANDOFF_THRESHOLD) {
      return {
        ...state,
        phase: 'paging',
        trackOffset: overshoot,
        overshoot,
        // Everything before the overshoot belongs to the pan, not the page.
        pageBase: delta.x - overshoot,
        transform: clampX(state.startTransform, bounds, direction),
      }
    }

    // Below the threshold, resist — that pushback is what says "this is the
    // end of the image; keep going and you'll change page".
    return {
      ...state,
      overshoot,
      transform: {
        ...state.startTransform,
        x: clampX(state.startTransform, bounds, direction).x + rubberBand(overshoot, ctx.stage.width),
        y: clamp(wantY, bounds.minY, bounds.maxY),
      },
    }
  }

  const orient = orientedSize(ctx.natural, state.startTransform.rotation)
  const verticalSlack = orient.height * state.startTransform.scale > ctx.stage.height

  return {
    ...state,
    overshoot: 0,
    transform: {
      ...state.startTransform,
      x: clamp(wantX, bounds.minX, bounds.maxX),
      y: verticalSlack ? clamp(wantY, bounds.minY, bounds.maxY) : state.startTransform.y,
    },
  }
}

function clampX(t: Transform, bounds: ReturnType<typeof panBounds>, direction: -1 | 1): Transform {
  return { ...t, x: direction > 0 ? bounds.maxX : bounds.minX }
}

function release(
  state: GestureState,
  velocity: Point,
  ctx: GestureContext,
): { state: GestureState; commands: Command[] } {
  const settled: GestureState = { ...state, phase: 'idle', pinch: null, overshoot: 0, pageBase: 0 }

  switch (state.phase) {
    case 'paging': {
      const direction: -1 | 1 = state.trackOffset < 0 ? 1 : -1
      const travelled = Math.abs(state.trackOffset) / ctx.stage.width
      // A flick only commits when it agrees with the drag. Pulling the track
      // one way and snapping back the other is a cancellation, not a page turn.
      const flickDirection: -1 | 1 = velocity.x < 0 ? 1 : -1
      const flicked =
        Math.abs(velocity.x) > PAGE_COMMIT_VELOCITY && flickDirection === direction
      const commit = canPage(direction, ctx) && (travelled > PAGE_COMMIT_RATIO || flicked)

      return {
        state: { ...settled, trackOffset: 0, dismissProgress: 0 },
        commands: commit ? [{ type: 'page', direction }] : [{ type: 'snapBack' }],
      }
    }

    case 'dismissing': {
      const travelled = state.dismissProgress
      const flicked = velocity.y > DISMISS_COMMIT_VELOCITY
      const commit = travelled >= 1 || flicked
      return {
        state: { ...settled, dismissProgress: commit ? 1 : 0 },
        commands: commit
          ? [{ type: 'dismiss' }]
          : [{ type: 'cancelDismiss' }, { type: 'settle', target: state.startTransform }],
      }
    }

    case 'panning': {
      return { state: settled, commands: [{ type: 'flingPan', velocity }] }
    }

    case 'pinching': {
      // A pinch that ends below fit has been let go of; return it to fit.
      const target =
        state.transform.scale < ctx.fitScale
          ? { ...state.transform, scale: ctx.fitScale, x: 0, y: 0 }
          : state.transform
      return { state: settled, commands: [{ type: 'settle', target }] }
    }

    default:
      return { state: settled, commands: [] }
  }
}
