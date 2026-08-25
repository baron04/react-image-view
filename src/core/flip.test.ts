import { describe, expect, it } from 'vitest'
import { fittedFlipFrame, flipFrameFromRect } from './flip'

describe('flipFrameFromRect', () => {
  // The exact numbers from a real bug report: a 179×130 thumbnail box
  // (landscape) displaying a 1400×1900 image (portrait) via object-fit:
  // cover. The close animation's last frame measured 96×130 — a `contain`
  // fit — while the real thumbnail underneath it was 179×130. Different size,
  // different centring, a visible pop as the dialog unmounted.
  const stage = { x: 0, y: 0, width: 1280, height: 800 }
  const origin = { x: 218, y: 156, width: 179, height: 130 }
  const natural = { width: 1400, height: 1900 }

  it('cover: fills the box on the constraining axis, matching what object-fit: cover actually shows', () => {
    const frame = flipFrameFromRect(origin, stage, natural, 0, 'cover')
    // Width is the constraining axis here (image is relatively taller than
    // the box) — rendered width must equal the box's width exactly.
    expect(frame.transform.scale * natural.width).toBeCloseTo(origin.width, 5)
    // Height overflows before cropping — this is what the crop below removes.
    expect(frame.transform.scale * natural.height).toBeGreaterThan(origin.height)
  })

  it('cover: crops exactly the overflow, so the visible height matches the box after cropping', () => {
    const frame = flipFrameFromRect(origin, stage, natural, 0, 'cover')
    const visibleNaturalHeight = natural.height - frame.crop.top - frame.crop.bottom
    expect(visibleNaturalHeight * frame.transform.scale).toBeCloseTo(origin.height, 5)
    // The constraining axis (width) needs no crop at all.
    expect(frame.crop.left).toBe(0)
    expect(frame.crop.right).toBe(0)
    // Centred.
    expect(frame.crop.top).toBeCloseTo(frame.crop.bottom, 10)
  })

  it('contain: needs no crop — the whole image already fits inside the box', () => {
    const frame = flipFrameFromRect(origin, stage, natural, 0, 'contain')
    expect(frame.crop).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    // Contain is constrained by the other axis than cover was.
    expect(frame.transform.scale * natural.height).toBeCloseTo(origin.height, 5)
    expect(frame.transform.scale * natural.width).toBeLessThanOrEqual(origin.width + 1e-6)
  })

  it('cover crop still lands on the box exactly after a quarter turn', () => {
    // clip-path measures the image's own (unrotated) layout box, but the turn
    // changes which local axis maps onto which visual one — so the crop
    // amounts are not simply the upright ones swapped, they come from a
    // different cover computation entirely (a 90°-turned 1400×1900 image
    // against this same landscape box is now constrained by the other axis).
    // What must still hold: cropping the local box down and then mapping the
    // visible region through the turn lands on the origin box's size exactly,
    // same as the upright case.
    for (const rotation of [0, 90, 180, 270]) {
      const frame = flipFrameFromRect(origin, stage, natural, rotation, 'cover')
      const visibleLocalW = natural.width - frame.crop.left - frame.crop.right
      const visibleLocalH = natural.height - frame.crop.top - frame.crop.bottom
      const swapped = rotation === 90 || rotation === 270
      const visibleOriented = swapped
        ? { w: visibleLocalH, h: visibleLocalW }
        : { w: visibleLocalW, h: visibleLocalH }
      expect(visibleOriented.w * frame.transform.scale).toBeCloseTo(origin.width, 5)
      expect(visibleOriented.h * frame.transform.scale).toBeCloseTo(origin.height, 5)
    }
  })

  it('positions the image centred over the origin box, relative to the stage centre', () => {
    const frame = flipFrameFromRect(origin, stage, natural, 0, 'cover')
    const originCentreX = origin.x + origin.width / 2
    const stageCentreX = stage.x + stage.width / 2
    expect(frame.transform.x).toBeCloseTo(originCentreX - stageCentreX, 5)
  })
})

describe('fittedFlipFrame', () => {
  it('is always uncropped — the at-rest state shows the whole image', () => {
    const frame = fittedFlipFrame(0.5, 90)
    expect(frame.crop).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    expect(frame.transform).toEqual({ scale: 0.5, x: 0, y: 0, rotation: 90 })
  })
})
