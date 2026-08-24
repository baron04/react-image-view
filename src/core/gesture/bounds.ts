import type { Bounds, Size, Transform } from '../types'
import { renderedSize } from '../transform'

/**
 * How far the image may be panned. When a dimension is smaller than the stage
 * it stays centred, so both ends of that axis collapse to 0.
 */
export function panBounds(natural: Size, stage: Size, t: Transform): Bounds {
  const r = renderedSize(natural, t)
  const slackX = Math.max(0, (r.width - stage.width) / 2)
  const slackY = Math.max(0, (r.height - stage.height) / 2)
  // `+ 0` normalises -0, which compares equal to 0 but trips Object.is and
  // snapshot equality further downstream.
  return { minX: -slackX + 0, maxX: slackX, minY: -slackY + 0, maxY: slackY }
}

/**
 * Pan distance still available in `direction` on this axis. Zero is the signal
 * the pager waits for: once the image cannot move further, continued dragging
 * belongs to page navigation rather than to panning.
 */
export function remainingIn(position: number, bounds: Bounds, axis: 'x' | 'y', direction: -1 | 1): number {
  const min = axis === 'x' ? bounds.minX : bounds.minY
  const max = axis === 'x' ? bounds.maxX : bounds.maxY
  return direction > 0 ? Math.max(0, max - position) : Math.max(0, position - min)
}

/**
 * Progressive resistance past an edge (the iOS formula). Resistance grows with
 * displacement, so the edge is felt rather than hit — and that feedback is what
 * tells someone "this is the end, keep pulling and you'll turn the page".
 */
export function rubberBand(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0
  const sign = Math.sign(overshoot)
  const d = Math.abs(overshoot)
  return sign * (1 - 1 / (d * constant / dimension + 1)) * dimension
}

export function clampToBounds(t: Transform, bounds: Bounds): Transform {
  return {
    ...t,
    x: Math.min(bounds.maxX, Math.max(bounds.minX, t.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, t.y)),
  }
}
