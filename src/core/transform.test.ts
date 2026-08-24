import { describe, expect, it } from 'vitest'
import { fitScale, maxScale, orientedSize, renderedSize, zoomAbout } from './transform'
import { panBounds, remainingIn, rubberBand } from './gesture/bounds'

describe('fitScale', () => {
  it('fits by the tighter axis', () => {
    expect(fitScale({ width: 2000, height: 1000 }, { width: 800, height: 800 })).toBeCloseTo(0.4)
  })

  it('leaves a small image alone rather than magnifying blur into it', () => {
    expect(fitScale({ width: 100, height: 80 }, { width: 800, height: 600 })).toBe(1)
  })

  it('fills the stage when upscaling is asked for', () => {
    const s = fitScale({ width: 100, height: 80 }, { width: 800, height: 600 }, 0, true)
    expect(s).toBeGreaterThan(1)
  })

  it('accounts for a quarter turn', () => {
    const natural = { width: 1000, height: 2000 }
    const stage = { width: 800, height: 600 }
    // Upright it is height-constrained (600/2000); turned it is 2000 wide and
    // becomes width-constrained (800/2000). Different limits, different result.
    expect(fitScale(natural, stage, 0)).toBeCloseTo(0.3)
    expect(fitScale(natural, stage, 90)).toBeCloseTo(0.4)
  })
})

describe('maxScale', () => {
  it('always leaves 1:1 reachable — a fixed cap is what strands large scans', () => {
    for (const natural of [
      { width: 500, height: 400 },
      { width: 4000, height: 3000 },
      { width: 12000, height: 9000 },
    ]) {
      expect(maxScale(natural)).toBeGreaterThanOrEqual(1)
    }
  })

  it('tightens as the image grows, so the raster budget holds', () => {
    const small = maxScale({ width: 800, height: 600 })
    const large = maxScale({ width: 8000, height: 6000 })
    expect(small).toBeGreaterThan(large)
  })

  it('pins a huge image at 1:1 instead of letting it exhaust memory', () => {
    expect(maxScale({ width: 20000, height: 20000 })).toBe(1)
  })
})

describe('orientedSize', () => {
  it('swaps axes on the quarter turns only', () => {
    expect(orientedSize({ width: 400, height: 300 }, 0)).toEqual({ width: 400, height: 300 })
    expect(orientedSize({ width: 400, height: 300 }, 90)).toEqual({ width: 300, height: 400 })
    expect(orientedSize({ width: 400, height: 300 }, 180)).toEqual({ width: 400, height: 300 })
    expect(orientedSize({ width: 400, height: 300 }, -90)).toEqual({ width: 300, height: 400 })
  })
})

describe('zoomAbout', () => {
  it('holds the anchor point still', () => {
    const before = { scale: 1, x: 0, y: 0, rotation: 0 }
    const origin = { x: 100, y: 50 }
    const after = zoomAbout(before, 2, origin)
    // The content under `origin` must map to the same screen point at both scales.
    const contentBefore = (origin.x - before.x) / before.scale
    const contentAfter = (origin.x - after.x) / after.scale
    expect(contentAfter).toBeCloseTo(contentBefore, 6)
  })

  it('leaves the centre alone when zooming about it', () => {
    const after = zoomAbout({ scale: 1, x: 0, y: 0, rotation: 0 }, 3, { x: 0, y: 0 })
    expect(after.x).toBe(0)
    expect(after.y).toBe(0)
  })
})

describe('pan bounds', () => {
  const natural = { width: 2000, height: 1500 }
  const stage = { width: 800, height: 600 }

  it('collapses to centred when the image is smaller than the stage', () => {
    const b = panBounds(natural, stage, { scale: 0.2, x: 0, y: 0, rotation: 0 })
    expect(b).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 })
  })

  it('opens up symmetrically once the image overflows', () => {
    const b = panBounds(natural, stage, { scale: 0.8, x: 0, y: 0, rotation: 0 })
    expect(b.maxX).toBeCloseTo(400)
    expect(b.minX).toBeCloseTo(-400)
  })

  it('reports zero remaining at the edge — the pager waits on exactly this', () => {
    const b = panBounds(natural, stage, { scale: 0.8, x: 0, y: 0, rotation: 0 })
    expect(remainingIn(400, b, 'x', 1)).toBe(0)
    expect(remainingIn(400, b, 'x', -1)).toBe(800)
    expect(remainingIn(0, b, 'x', 1)).toBe(400)
  })
})

describe('rubberBand', () => {
  it('always resists — output trails input', () => {
    for (const d of [10, 50, 200, 600]) {
      expect(Math.abs(rubberBand(d, 800))).toBeLessThan(d)
    }
  })

  it('resists harder the further it is pulled', () => {
    const nearRatio = rubberBand(50, 800) / 50
    const farRatio = rubberBand(400, 800) / 400
    expect(farRatio).toBeLessThan(nearRatio)
  })

  it('keeps the sign of the pull', () => {
    expect(rubberBand(-100, 800)).toBeLessThan(0)
    expect(rubberBand(0, 800)).toBe(0)
  })
})

describe('renderedSize', () => {
  it('multiplies the oriented size by scale', () => {
    expect(renderedSize({ width: 400, height: 300 }, { scale: 2, x: 0, y: 0, rotation: 90 }))
      .toEqual({ width: 600, height: 800 })
  })
})
