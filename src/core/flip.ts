import type { Size, Transform } from './types'
import { orientedSize } from './transform'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** How the trigger's own element displays the thumbnail image. */
export type ThumbnailFit = 'contain' | 'cover'

/** Natural-image-pixel crop, one value per edge — 0 on every side shows the whole image. */
export interface Crop {
  top: number
  right: number
  bottom: number
  left: number
}

export interface FlipFrame {
  transform: Transform
  crop: Crop
}

export const NO_CROP: Crop = { top: 0, right: 0, bottom: 0, left: 0 }

/**
 * The transform (and, for a `cover` thumbnail, the crop) that parks the full
 * image exactly over the thumbnail it was opened from — the "First" half of
 * FLIP. Applied before paint and then animated away, it makes the preview
 * appear to grow out of the thumbnail rather than fade in over it.
 *
 * `fit` has to match how the trigger itself renders the image or the flight
 * lands somewhere visibly different from the real thumbnail — this was a
 * real, reported bug: `cover` is what most thumbnail grids use (it fills the
 * box, no letterboxing), and computing a `contain` transform against a
 * `cover`-fit box lands the animation's last frame at the wrong size, inside
 * the real thumbnail's box rather than filling it. `contain` needs no crop —
 * the whole image already fits inside the box with nothing hanging outside
 * it, which is also the right fallback when the trigger's fit mode can't be
 * determined (see `ImageView`'s `detectFit`).
 */
export function flipFrameFromRect(
  origin: Rect,
  stage: Rect,
  natural: Size,
  rotation: number,
  fit: ThumbnailFit,
): FlipFrame {
  const o = orientedSize(natural, rotation)
  const x = origin.x + origin.width / 2 - (stage.x + stage.width / 2)
  const y = origin.y + origin.height / 2 - (stage.y + stage.height / 2)

  if (o.width <= 0 || o.height <= 0) {
    return { transform: { scale: 1, x, y, rotation }, crop: NO_CROP }
  }

  if (fit === 'contain') {
    const scale = Math.min(origin.width / o.width, origin.height / o.height)
    return { transform: { scale, x, y, rotation }, crop: NO_CROP }
  }

  // cover: scaled up until the image fills the box on its shorter axis: the
  // other axis then overflows the box by construction, and that overflow is
  // exactly what a real `object-fit: cover` thumbnail has cropped away.
  const scale = Math.max(origin.width / o.width, origin.height / o.height)

  // Crop amounts below are along the ORIENTED (visual) axes — swapped back
  // onto the media layer's local width/height (what clip-path actually measures
  // against, since it sits inside the transformed layer) only at
  // the very end, and only when the turn is 90/270.
  const overflowOrientedW = Math.max(0, o.width - origin.width / scale)
  const overflowOrientedH = Math.max(0, o.height - origin.height / scale)
  const swapped = (((Math.round(rotation / 90) % 4) + 4) % 4) % 2 === 1
  const overflowLocalW = swapped ? overflowOrientedH : overflowOrientedW
  const overflowLocalH = swapped ? overflowOrientedW : overflowOrientedH

  return {
    transform: { scale, x, y, rotation },
    crop: {
      left: overflowLocalW / 2,
      right: overflowLocalW / 2,
      top: overflowLocalH / 2,
      bottom: overflowLocalH / 2,
    },
  }
}

/** The at-rest frame: the whole image, uncropped. */
export function fittedFlipFrame(scale: number, rotation: number): FlipFrame {
  return { transform: { scale, x: 0, y: 0, rotation }, crop: NO_CROP }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}
