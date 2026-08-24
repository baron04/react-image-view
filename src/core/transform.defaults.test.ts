import { describe, expect, it } from 'vitest'
import { fitScale } from './transform'

/**
 * The opening size rule, stated as a test because it is a product decision
 * rather than an implementation detail: show the image at 1:1, and only shrink
 * it when 1:1 does not fit. Nothing is ever enlarged past its own resolution —
 * magnifying a small screenshot only invents blur.
 */
describe('default opening size', () => {
  const stage = { width: 1280, height: 720 }

  it('opens a small image at exactly 1:1', () => {
    expect(fitScale({ width: 400, height: 300 }, stage)).toBe(1)
    expect(fitScale({ width: 1280, height: 720 }, stage)).toBe(1)
  })

  it('falls back to fitting when 1:1 would overflow', () => {
    // Wider than the stage: constrained by width.
    expect(fitScale({ width: 2560, height: 720 }, stage)).toBeCloseTo(0.5)
    // Taller than the stage: constrained by height.
    expect(fitScale({ width: 400, height: 1440 }, stage)).toBeCloseTo(0.5)
  })

  it('never opens above 1:1, however much room there is', () => {
    for (const natural of [
      { width: 10, height: 10 },
      { width: 100, height: 80 },
      { width: 640, height: 480 },
    ]) {
      expect(fitScale(natural, stage)).toBeLessThanOrEqual(1)
    }
  })
})
