/**
 * Physics for settling motion. Deliberately hand-rolled: a critically damped
 * spring and an exponential decay are a few dozen lines between them, and the
 * alternative is taking on an animation library as a runtime dependency for a
 * package whose whole budget is under 10 kB.
 */

export interface SpringState {
  value: number
  velocity: number
}

/**
 * Longest slice the integrator will take in one go, in seconds.
 *
 * Explicit integration of a stiff spring blows up once the step grows past
 * roughly 2/sqrt(stiffness): the velocity term is amplified instead of damped
 * and the value runs away. A dropped frame or a backgrounded tab is enough to
 * get there, and the symptom is spectacular — the image flies off screen.
 * Sub-stepping keeps every slice small no matter how long the frame was.
 */
const MAX_SUBSTEP = 1 / 240

/**
 * Critically damped step — reaches the target as fast as possible without
 * overshooting. Overshoot reads as bounciness, which is wrong for a tool.
 *
 * Stable for any `dt`: a long frame is integrated as several short ones.
 */
export function springStep(
  state: SpringState,
  target: number,
  stiffness: number,
  dt: number,
): SpringState {
  const damping = 2 * Math.sqrt(stiffness)
  let value = state.value
  let velocity = state.velocity
  let remaining = dt

  while (remaining > 0) {
    const step = Math.min(remaining, MAX_SUBSTEP)
    const acceleration = -stiffness * (value - target) - damping * velocity
    velocity += acceleration * step
    value += velocity * step
    remaining -= step
  }

  return { value, velocity }
}

/**
 * Inertia after a flick.
 *
 * Both channels are solved analytically rather than integrated, so the result
 * depends only on elapsed time. Stepping the position numerically made a flick
 * carry a different distance on a janky frame than on a smooth one — small,
 * but it is the kind of inconsistency that makes a gesture feel unreliable
 * without anyone being able to say why.
 *
 *   v(t) = v0 * e^(-f t)
 *   x(t) = x0 + (v0 / f) * (1 - e^(-f t))
 */
export function decayStep(state: SpringState, friction: number, dt: number): SpringState {
  if (friction <= 0) return { value: state.value + state.velocity * dt, velocity: state.velocity }
  const decay = Math.exp(-friction * dt)
  return {
    value: state.value + (state.velocity / friction) * (1 - decay),
    velocity: state.velocity * decay,
  }
}

/**
 * Position and velocity need separate thresholds.
 *
 * A critically damped spring approaches its target asymptotically, so a tight
 * epsilon keeps the loop alive long after the motion is visually over. Sharing
 * one epsilon between a value near 1 (scale) and a velocity in the hundreds
 * (translation) makes that worse in both directions.
 */
export function isSettled(
  state: SpringState,
  target: number,
  valueEpsilon = 0.01,
  velocityEpsilon = valueEpsilon * 10,
): boolean {
  return Math.abs(state.value - target) < valueEpsilon && Math.abs(state.velocity) < velocityEpsilon
}
