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
  el.style.transform =
    `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale}) rotate(${t.rotation}deg)`
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
 * Crop the image to a natural-pixel window, via `clip-path` on the element
 * itself. `clip-path: inset(...)` resolves against the element's own
 * (untransformed) border box — which for our `<img>` is laid out at natural
 * size — so a crop expressed in natural pixels here scales correctly along
 * with whatever `scale()` `paintImage` is applying, without the two having
 * to coordinate. All-zero is cheap to leave in place; it's equivalent to no
 * clip at all.
 */
export function paintCrop(el: HTMLElement | null, crop: Crop): void {
  if (!el) return
  const { top, right, bottom, left } = crop
  el.style.clipPath =
    top === 0 && right === 0 && bottom === 0 && left === 0
      ? ''
      : `inset(${top}px ${right}px ${bottom}px ${left}px)`
}
