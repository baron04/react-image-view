import type { Transform } from '../core/types'

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
