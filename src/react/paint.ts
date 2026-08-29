import type { Transform } from '../core/types'
import type { Crop } from '../core/flip'

/**
 * Write a transform straight to the element.
 *
 * This deliberately bypasses React. During a gesture the transform changes
 * every frame, and routing that through state would re-render the subtree
 * sixty times a second for a value only one node reads.
 */
export function paintImage(el: HTMLElement | null, t: Transform): void {
  if (!el) return
  el.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale}) rotate(${t.rotation}deg)`
}

/**
 * Slides sit at whole multiples of the stage width, so the resting position is
 * a percentage and survives a resize untouched; only the drag offset is in px.
 */
export function paintTrack(el: HTMLElement | null, index: number, offsetPx: number): void {
  if (!el) return
  el.style.transform = `translate3d(calc(${-index * 100}% + ${offsetPx}px), 0, 0)`
}

/**
 * Crop the media to a natural-pixel window. The crop layer has the image's
 * natural layout size and sits inside the independently transformed layer, so
 * these values scale with the media without putting `clip-path` and
 * `transform` on the image itself. Keeping them together can force expensive
 * re-rasterisation while a large image is moving.
 */
export function paintCrop(el: HTMLElement | null, crop: Crop): void {
  if (!el) return
  const { top, right, bottom, left } = crop
  el.style.clipPath =
    top === 0 && right === 0 && bottom === 0 && left === 0
      ? ''
      : `inset(${top}px ${right}px ${bottom}px ${left}px)`
}

/** Set or clear the compositor transition used by shared-element flights. */
export function paintTransition(el: HTMLElement | null, value: string): void {
  if (el) el.style.transition = value
}
