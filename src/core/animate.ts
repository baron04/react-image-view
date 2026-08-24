import type { Bounds, Point, Transform } from './types'
import { decayStep, isSettled, springStep, type SpringState } from './gesture/spring'
import type { Ticker } from './ticker'

const SETTLE_STIFFNESS = 170

/** Spring every channel of a transform to `target` at once. */
export function animateTransform(
  ticker: Ticker,
  from: Transform,
  target: Transform,
  onFrame: (t: Transform) => void,
  onDone?: () => void,
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
      // Scale lives near 1 while translation lives in the hundreds, so a shared
      // epsilon would settle one channel long before the other looks still.
      const scaleFactor = key === 'scale' ? 0.001 : 0.1
      channels[key] = springStep(channels[key], target[key], SETTLE_STIFFNESS, dt)
      if (!isSettled(channels[key], target[key], scaleFactor)) done = false
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

const FLING_FRICTION = 5

/**
 * Carry a released pan on, then bring it home if it left the bounds.
 *
 * The two stages are separate on purpose: inertia is what makes a flick feel
 * like it has weight, and the spring afterwards is what stops it ending up
 * somewhere the image is not allowed to be.
 */
export function animateFling(
  ticker: Ticker,
  from: Transform,
  velocity: Point,
  bounds: Bounds,
  onFrame: (t: Transform) => void,
  onDone?: () => void,
): () => void {
  let x: SpringState = { value: from.x, velocity: velocity.x * 1000 }
  let y: SpringState = { value: from.y, velocity: velocity.y * 1000 }

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
  ticker: Ticker,
  from: number,
  to: number,
  onFrame: (value: number) => void,
  onDone?: () => void,
): () => void {
  let state: SpringState = { value: from, velocity: 0 }
  return ticker.add((dtMs) => {
    state = springStep(state, to, SETTLE_STIFFNESS, dtMs / 1000)
    if (isSettled(state, to, 0.1)) {
      onFrame(to)
      onDone?.()
      return false
    }
    onFrame(state.value)
    return true
  })
}
