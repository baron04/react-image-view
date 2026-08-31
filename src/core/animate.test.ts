import { describe, expect, it, vi } from 'vitest'
import { animateFling, animateFlipFrame, animateTransform, animateValue } from './animate'
import type { TickFn } from './ticker'
import type { Bounds, Transform } from './types'
import { NO_CROP, type FlipFrame } from './flip'

/**
 * A ticker driven by hand.
 *
 * The real one owns `requestAnimationFrame`, which `core/` deliberately has no
 * access to. Stepping frames explicitly also makes the assertions about *when*
 * something finishes possible at all — a real clock can only be waited on.
 */
class Frames {
  private fns = new Set<TickFn>()

  add = (fn: TickFn) => {
    this.fns.add(fn)
    return () => {
      this.fns.delete(fn)
    }
  }

  get running() {
    return this.fns.size > 0
  }

  /** Run frames until everything finishes, or give up and say so. */
  run(maxFrames = 600, dtMs = 16) {
    let frames = 0
    while (this.fns.size > 0 && frames < maxFrames) {
      for (const fn of [...this.fns]) if (!fn(dtMs)) this.fns.delete(fn)
      frames++
    }
    return { frames, settled: this.fns.size === 0 }
  }

  step(count = 1, dtMs = 16) {
    for (let i = 0; i < count; i++) {
      for (const fn of [...this.fns]) if (!fn(dtMs)) this.fns.delete(fn)
    }
  }
}

const IDENTITY: Transform = { scale: 1, x: 0, y: 0, rotation: 0 }
const WIDE_BOUNDS: Bounds = { minX: -1e6, maxX: 1e6, minY: -1e6, maxY: 1e6 }

describe('animateTransform', () => {
  it('lands exactly on the target rather than near it', () => {
    const frames = new Frames()
    const target: Transform = { scale: 2.5, x: -120, y: 40, rotation: 90 }
    const seen: Transform[] = []
    const onDone = vi.fn()

    animateTransform(frames, IDENTITY, target, (t) => seen.push(t), onDone)
    const { settled } = frames.run()

    expect(settled).toBe(true)
    expect(onDone).toHaveBeenCalledOnce()
    // The last frame is the target object itself, not an approximation of it.
    // Anything else leaves the image a fraction of a pixel off forever.
    expect(seen[seen.length - 1]).toEqual(target)
  })

  it('settles scale and translation together, not one long after the other', () => {
    // The regression this pins: one shared epsilon across channels. Scale sits
    // around 1 while x runs to the hundreds, so a threshold loose enough for x
    // finishes scale early, and one tight enough for scale leaves x crawling.
    const scaleOnly = new Frames()
    animateTransform(scaleOnly, IDENTITY, { ...IDENTITY, scale: 1.02 }, () => {})
    const small = scaleOnly.run()

    const farOnly = new Frames()
    animateTransform(farOnly, IDENTITY, { ...IDENTITY, x: 800 }, () => {})
    const large = farOnly.run()

    expect(small.settled).toBe(true)
    expect(large.settled).toBe(true)
    // Neither channel should need an order of magnitude more frames.
    expect(large.frames).toBeLessThan(small.frames * 4)
  })

  it('stops when cancelled and never reports done', () => {
    const frames = new Frames()
    const onFrame = vi.fn()
    const onDone = vi.fn()

    const cancel = animateTransform(frames, IDENTITY, { ...IDENTITY, x: 500 }, onFrame, onDone)
    frames.step(2)
    const framesSoFar = onFrame.mock.calls.length
    cancel()
    frames.step(10)

    expect(framesSoFar).toBeGreaterThan(0)
    expect(onFrame.mock.calls.length).toBe(framesSoFar)
    expect(onDone).not.toHaveBeenCalled()
  })
})

describe('animateFling', () => {
  it('carries a real flick further than the frame it was released on', () => {
    const frames = new Frames()
    const seen: Transform[] = []

    animateFling(frames, IDENTITY, { x: 3, y: 0 }, WIDE_BOUNDS, (t) => seen.push(t))
    frames.run()

    // Inertia is the whole point: releasing at speed has to keep moving.
    expect(seen[seen.length - 1]!.x).toBeGreaterThan(50)
  })

  it('does not throw when the release was slow', () => {
    const frames = new Frames()
    const seen: Transform[] = []
    const onDone = vi.fn()

    animateFling(frames, IDENTITY, { x: 0.001, y: 0 }, WIDE_BOUNDS, (t) => seen.push(t), onDone)
    frames.run()

    expect(onDone).toHaveBeenCalled()
    expect(Math.abs(seen[seen.length - 1]!.x)).toBeLessThan(1)
  })

  it('always ends inside the bounds, however hard it was thrown', () => {
    const frames = new Frames()
    const bounds: Bounds = { minX: -100, maxX: 100, minY: -50, maxY: 50 }
    const seen: Transform[] = []
    const onDone = vi.fn()

    animateFling(frames, IDENTITY, { x: 40, y: 40 }, bounds, (t) => seen.push(t), onDone)
    const { settled } = frames.run()

    expect(settled).toBe(true)
    expect(onDone).toHaveBeenCalled()
    const last = seen[seen.length - 1]!
    // Overshooting the edge hands off to a spring; the handoff is only correct
    // if the image actually comes back inside.
    expect(last.x).toBeLessThanOrEqual(bounds.maxX + 0.5)
    expect(last.y).toBeLessThanOrEqual(bounds.maxY + 0.5)
  })
})

describe('animateValue', () => {
  it('reaches the target value exactly', () => {
    const frames = new Frames()
    const seen: number[] = []
    const onDone = vi.fn()

    animateValue(frames, 0, 320, (v) => seen.push(v), onDone)
    const { settled } = frames.run()

    expect(settled).toBe(true)
    expect(onDone).toHaveBeenCalledOnce()
    expect(seen[seen.length - 1]).toBe(320)
  })
})

describe('animateFlipFrame', () => {
  it('moves the transform and the crop as one motion', () => {
    const frames = new Frames()
    const from: FlipFrame = {
      transform: { scale: 0.2, x: -300, y: -200, rotation: 0 },
      crop: NO_CROP,
    }
    const target: FlipFrame = {
      transform: IDENTITY,
      crop: { top: 40, right: 10, bottom: 40, left: 10 },
    }
    const seen: FlipFrame[] = []
    const onDone = vi.fn()

    animateFlipFrame(frames, from, target, (f) => seen.push(f), onDone)
    const { settled } = frames.run()

    expect(settled).toBe(true)
    expect(onDone).toHaveBeenCalledOnce()
    expect(seen[seen.length - 1]).toEqual(target)

    // Both halves have to be in flight together. A crop that finishes first
    // shows the full image inside a thumbnail-sized box for the rest of the
    // flight, which is the artefact this function exists to avoid.
    const midway = seen[Math.floor(seen.length / 2)]!
    expect(midway.crop.top).toBeGreaterThan(0)
    expect(midway.crop.top).toBeLessThan(target.crop.top)
    expect(midway.transform.scale).toBeGreaterThan(from.transform.scale)
    expect(midway.transform.scale).toBeLessThan(target.transform.scale)
  })
})
