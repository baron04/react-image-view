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
 * Critically damped step — reaches the target as fast as possible without
 * overshooting. Overshoot reads as bounciness, which is wrong for a tool.
 */
export function springStep(
  state: SpringState,
  target: number,
  stiffness: number,
  dt: number,
): SpringState {
  const damping = 2 * Math.sqrt(stiffness)
  const displacement = state.value - target
  const acceleration = -stiffness * displacement - damping * state.velocity
  const velocity = state.velocity + acceleration * dt
  return { value: state.value + velocity * dt, velocity }
}

/** Inertia after a flick: velocity decays exponentially, framerate-independent. */
export function decayStep(state: SpringState, friction: number, dt: number): SpringState {
  const velocity = state.velocity * Math.exp(-friction * dt)
  return { value: state.value + velocity * dt, velocity }
}

export function isSettled(state: SpringState, target: number, epsilon = 0.01): boolean {
  return Math.abs(state.value - target) < epsilon && Math.abs(state.velocity) < epsilon
}
