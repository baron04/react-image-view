import { describe, expect, it } from 'vitest'
import { decayStep, isSettled, springStep, type SpringState } from './spring'

function settle(from: number, target: number, stiffness: number, dt: number, steps = 400) {
  let state: SpringState = { value: from, velocity: 0 }
  let peak = Math.abs(from - target)
  for (let i = 0; i < steps; i++) {
    state = springStep(state, target, stiffness, dt)
    peak = Math.max(peak, Math.abs(state.value - target))
    if (isSettled(state, target, 0.002, 0.02)) return { state, frames: i + 1, peak }
  }
  return { state, frames: steps, peak }
}

describe('springStep', () => {
  it('converges at a normal frame rate', () => {
    const { state } = settle(0.3, 1, 340, 1 / 60)
    expect(state.value).toBeCloseTo(1, 2)
  })

  it('stays stable across a long frame', () => {
    // The regression: a dropped frame or a backgrounded tab hands the
    // integrator a step far past the point where explicit integration blows
    // up. It used to diverge — the image grew to 38000px and flew off screen.
    for (const dt of [1 / 30, 1 / 15, 0.064, 0.2, 1]) {
      const { state, peak } = settle(0.3, 1, 340, dt)
      expect(Number.isFinite(state.value)).toBe(true)
      // Never travels further from the target than it started.
      expect(peak).toBeLessThanOrEqual(0.7 + 1e-6)
      expect(state.value).toBeCloseTo(1, 1)
    }
  })

  it('does not overshoot — bounce reads as playful, which this is not', () => {
    let state: SpringState = { value: 0, velocity: 0 }
    let maxValue = 0
    for (let i = 0; i < 200; i++) {
      state = springStep(state, 1, 340, 1 / 60)
      maxValue = Math.max(maxValue, state.value)
    }
    expect(maxValue).toBeLessThanOrEqual(1 + 1e-3)
  })

  it('settles faster the stiffer it is', () => {
    expect(settle(0, 1, 600, 1 / 60).frames).toBeLessThan(settle(0, 1, 150, 1 / 60).frames)
  })
})

describe('decayStep', () => {
  it('bleeds velocity away and is framerate independent', () => {
    const oneBigStep = decayStep({ value: 0, velocity: 1000 }, 5, 0.1)
    let small: SpringState = { value: 0, velocity: 1000 }
    for (let i = 0; i < 10; i++) small = decayStep(small, 5, 0.01)
    expect(small.velocity).toBeCloseTo(oneBigStep.velocity, 6)
    // Solved analytically, so ten small steps land exactly where one long one
    // does. Integrating the position instead made a flick carry further on a
    // smooth frame than on a janky one.
    expect(small.value).toBeCloseTo(oneBigStep.value, 6)
  })
})

describe('isSettled', () => {
  it('needs both position and velocity to be small', () => {
    expect(isSettled({ value: 1, velocity: 0 }, 1, 0.01, 0.1)).toBe(true)
    expect(isSettled({ value: 1, velocity: 5 }, 1, 0.01, 0.1)).toBe(false)
    expect(isSettled({ value: 2, velocity: 0 }, 1, 0.01, 0.1)).toBe(false)
  })
})
