import type { Bounds, Point, Transform } from './types'
import type { FlipFrame } from './flip'
import { decayStep, isSettled, springStep, type SpringState } from './gesture/spring'
import type { Ticker } from './ticker'

/**
 * Only `add` is ever called here, and narrowing to it is what lets these
 * functions be driven frame by frame in a test. `Ticker` has private fields,
 * which makes it nominally typed, so a stand-in would otherwise need a cast
 * — and a cast in a test is a hole in the thing being tested.
 */
type Frames = Pick<Ticker, 'add'>
import { tuning } from './tuning'

// See ./tuning for the reasoning behind every value below.
const SETTLE_STIFFNESS = tuning.spring.settleStiffness

/**
 * Per-channel settle thresholds, in the channel's own units.
 *
 * Scale sits around 1 while translation runs to the hundreds, so one shared
 * epsilon would either cut translation off early or leave scale spinning
 * invisibly — which it did: the image stopped moving after ~500ms while the
 * controls waited another second to catch up.
 */
const SETTLE_EPSILON: Record<keyof Transform, { value: number; velocity: number }> = {
  scale: { value: 0.002, velocity: 0.02 },
  x: { value: 0.3, velocity: 3 },
  y: { value: 0.3, velocity: 3 },
  rotation: { value: 0.2, velocity: 2 },
}

/** Spring every channel of a transform to `target` at once. */
export function animateTransform(
  ticker: Frames,
  from: Transform,
  target: Transform,
  onFrame: (t: Transform) => void,
  onDone?: () => void,
  stiffness: number = SETTLE_STIFFNESS,
): () => void {
  const channels: Record<keyof Transform, SpringState> = {
    scale: { value: from.scale, velocity: 0 },
    x: { value: from.x, velocity: 0 },
    y: { value: from.y, velocity: 0 },
    rotation: { value: from.rotation, velocity: 0 },
  }

  return ticker.add((dtMs) => {
    const dt = dtMs / 1000
    let done = true

    for (const key of Object.keys(channels) as (keyof Transform)[]) {
      const eps = SETTLE_EPSILON[key]
      channels[key] = springStep(channels[key], target[key], stiffness, dt)
      if (!isSettled(channels[key], target[key], eps.value, eps.velocity)) done = false
    }

    if (done) {
      onFrame(target)
      onDone?.()
      return false
    }

    onFrame({
      scale: channels.scale.value,
      x: channels.x.value,
      y: channels.y.value,
      rotation: channels.rotation.value,
    })
    return true
  })
}

const FLING_FRICTION = tuning.fling.friction
const FLING_MIN_VELOCITY = tuning.fling.minVelocity

/**
 * Carry a released pan on, then bring it home if it left the bounds.
 *
 * The two stages are separate on purpose: inertia is what makes a flick feel
 * like it has weight, and the spring afterwards is what stops it ending up
 * somewhere the image is not allowed to be.
 */
export function animateFling(
  ticker: Frames,
  from: Transform,
  velocity: Point,
  bounds: Bounds,
  onFrame: (t: Transform) => void,
  onDone?: () => void,
): () => void {
  const speed = Math.hypot(velocity.x, velocity.y)
  const throwing = speed >= FLING_MIN_VELOCITY

  let x: SpringState = { value: from.x, velocity: throwing ? velocity.x * 1000 : 0 }
  let y: SpringState = { value: from.y, velocity: throwing ? velocity.y * 1000 : 0 }

  return ticker.add((dtMs) => {
    const dt = dtMs / 1000
    x = decayStep(x, FLING_FRICTION, dt)
    y = decayStep(y, FLING_FRICTION, dt)

    const clampedX = Math.min(bounds.maxX, Math.max(bounds.minX, x.value))
    const clampedY = Math.min(bounds.maxY, Math.max(bounds.minY, y.value))
    const outOfBounds = clampedX !== x.value || clampedY !== y.value

    if (outOfBounds) {
      // Past an edge the fling is over; hand the rest to a spring so the image
      // eases back in instead of stopping dead against the boundary.
      const current = { ...from, x: x.value, y: y.value }
      animateTransform(ticker, current, { ...from, x: clampedX, y: clampedY }, onFrame, onDone)
      return false
    }

    if (Math.abs(x.velocity) < 1 && Math.abs(y.velocity) < 1) {
      onFrame({ ...from, x: clampedX, y: clampedY })
      onDone?.()
      return false
    }

    onFrame({ ...from, x: x.value, y: y.value })
    return true
  })
}

/** Ease a number to a target — used for the track and the dismiss backdrop. */
export function animateValue(
  ticker: Frames,
  from: number,
  to: number,
  onFrame: (value: number) => void,
  onDone?: () => void,
): () => void {
  let state: SpringState = { value: from, velocity: 0 }
  return ticker.add((dtMs) => {
    state = springStep(state, to, SETTLE_STIFFNESS, dtMs / 1000)
    if (isSettled(state, to, 0.3, 3)) {
      onFrame(to)
      onDone?.()
      return false
    }
    onFrame(state.value)
    return true
  })
}

const FLIP_CHANNELS = ['scale', 'x', 'y', 'rotation', 'top', 'right', 'bottom', 'left'] as const
type FlipChannel = (typeof FLIP_CHANNELS)[number]

/**
 * Springs a FlipFrame (transform + crop) to its target as one motion.
 *
 * A separate function from `animateTransform` rather than a generalisation of
 * it: `crop` is a FLIP-only concept (it exists to make a `cover`-fit
 * thumbnail's crop line up with the full image while the two are the same
 * element), and folding it into the core `Transform` type would put a
 * FLIP-specific idea into the type every gesture and bounds calculation also
 * uses.
 */
export function animateFlipFrame(
  ticker: Frames,
  from: FlipFrame,
  target: FlipFrame,
  onFrame: (frame: FlipFrame) => void,
  onDone?: () => void,
  stiffness: number = SETTLE_STIFFNESS,
): () => void {
  const flat = (f: FlipFrame): Record<FlipChannel, number> => ({
    scale: f.transform.scale,
    x: f.transform.x,
    y: f.transform.y,
    rotation: f.transform.rotation,
    top: f.crop.top,
    right: f.crop.right,
    bottom: f.crop.bottom,
    left: f.crop.left,
  })
  const fromFlat = flat(from)
  const targetFlat = flat(target)

  const channels = {} as Record<FlipChannel, SpringState>
  for (const key of FLIP_CHANNELS) channels[key] = { value: fromFlat[key], velocity: 0 }

  const unflatten = (v: Record<FlipChannel, number>): FlipFrame => ({
    transform: { scale: v.scale, x: v.x, y: v.y, rotation: v.rotation },
    crop: { top: v.top, right: v.right, bottom: v.bottom, left: v.left },
  })

  return ticker.add((dtMs) => {
    const dt = dtMs / 1000
    let done = true
    const next = {} as Record<FlipChannel, number>

    for (const key of FLIP_CHANNELS) {
      const eps = key === 'scale' ? SETTLE_EPSILON.scale : SETTLE_EPSILON.x
      channels[key] = springStep(channels[key], targetFlat[key], stiffness, dt)
      if (!isSettled(channels[key], targetFlat[key], eps.value, eps.velocity)) done = false
      next[key] = channels[key].value
    }

    if (done) {
      onFrame(target)
      onDone?.()
      return false
    }

    onFrame(unflatten(next))
    return true
  })
}
