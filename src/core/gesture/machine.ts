import type { Point } from '../types'

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
 * A starting value, not a conclusion — this needs tuning on real hardware.
 */
export const HANDOFF_THRESHOLD = 40

export interface GestureContext {
  /** Fixed while a gesture is in flight; recomputed on resize. */
  stage: { width: number; height: number }
  scale: number
  fitScale: number
  /** Remaining pan distance in the direction of travel, per axis. */
  remaining: { x: number; y: number }
}

export interface GestureState {
  phase: GesturePhase
  origin: Point
  delta: Point
  /** Accumulated movement past an edge; feeds the pager on handoff. */
  overshoot: number
  pointers: number
}

export const initialState: GestureState = {
  phase: 'idle',
  origin: { x: 0, y: 0 },
  delta: { x: 0, y: 0 },
  overshoot: 0,
  pointers: 0,
}

/**
 * Which phase an undecided drag becomes.
 *
 * A zoomed image always pans first — page turns are reached only through the
 * handoff below, never directly, so that panning never loses to an eager pager.
 */
export function resolveIntent(delta: Point, ctx: GestureContext): GesturePhase {
  if (ctx.scale > ctx.fitScale) return 'panning'
  const { x, y } = { x: Math.abs(delta.x), y: Math.abs(delta.y) }
  if (x < INTENT_THRESHOLD && y < INTENT_THRESHOLD) return 'tracking'
  return x > y ? 'paging' : 'dismissing'
}

/**
 * The rule the competition gets wrong: a zoomed image that has run out of room
 * hands the rest of the drag to the pager instead of dead-ending.
 *
 * `overshoot` carries across so the finger is never interrupted — restarting
 * the page drag from zero is exactly what reads as a stutter.
 */
export function shouldHandOff(state: GestureState, ctx: GestureContext): boolean {
  return (
    state.phase === 'panning' &&
    ctx.remaining.x === 0 &&
    Math.abs(state.overshoot) > HANDOFF_THRESHOLD
  )
}
