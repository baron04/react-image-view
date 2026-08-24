import type { Size, Transform } from './types'
import { orientedSize } from './transform'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * The transform that parks the full image exactly over the thumbnail it was
 * opened from — the "First" half of FLIP.
 *
 * Applied before paint and then animated away, it makes the preview appear to
 * grow out of the thumbnail rather than fade in over it. Everything is derived
 * from two rectangles measured in viewport coordinates, so it holds however the
 * page is scrolled or laid out.
 */
export function transformFromRect(
  origin: Rect,
  stage: Rect,
  natural: Size,
  rotation = 0,
): Transform {
  const o = orientedSize(natural, rotation)
  if (o.width <= 0 || o.height <= 0) return { scale: 1, x: 0, y: 0, rotation }

  // Contain rather than cover: a thumbnail is usually cropped, and overflowing
  // its box would put image outside the frame the eye is tracking.
  const scale = Math.min(origin.width / o.width, origin.height / o.height)

  // x and y are measured from the stage centre, which is where the image sits
  // at rest.
  return {
    scale,
    x: origin.x + origin.width / 2 - (stage.x + stage.width / 2),
    y: origin.y + origin.height / 2 - (stage.y + stage.height / 2),
    rotation,
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}
