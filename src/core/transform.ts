import type { Size, Transform } from './types'
import { tuning } from './tuning'

export const IDENTITY: Transform = { scale: 1, x: 0, y: 0, rotation: 0 }

// Tunable values live in ./tuning — see that file for the reasoning behind
// each one and the note on real-device confirmation still being outstanding.
const MAX_RASTER_PIXELS = tuning.zoom.maxRasterPixels
const MAX_ZOOM_FACTOR = tuning.zoom.maxFactor

export function normaliseRotation(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** Natural size as it presents after rotation — axes swap on the quarter turns. */
export function orientedSize(natural: Size, rotation: number): Size {
  return normaliseRotation(rotation) % 180 === 90
    ? { width: natural.height, height: natural.width }
    : { width: natural.width, height: natural.height }
}

/**
 * The scale at which the image just fits inside the stage.
 *
 * Capped at 1 by default: in a review context, blowing a small screenshot up
 * past its own resolution only invents blur. Pass `allowUpscale` for gallery
 * use where filling the stage matters more than fidelity.
 */
export function fitScale(natural: Size, stage: Size, rotation = 0, allowUpscale = false): number {
  const o = orientedSize(natural, rotation)
  if (o.width <= 0 || o.height <= 0 || stage.width <= 0 || stage.height <= 0) return 1
  const ratio = Math.min(stage.width / o.width, stage.height / o.height)
  return allowUpscale ? ratio : Math.min(ratio, 1)
}

/**
 * Upper zoom bound, derived rather than hard-coded.
 *
 * Two failure modes bracket this. A fixed `maxScale: 6` leaves a large scan
 * unable to reach its own resolution; no limit at all lets the raster budget
 * blow up. So: never below 1 (1:1 must always be reachable), never above what
 * the pixel budget allows.
 */
export function maxScale(natural: Size, rotation = 0): number {
  const o = orientedSize(natural, rotation)
  const area = o.width * o.height
  if (area <= 0) return MAX_ZOOM_FACTOR
  const budgeted = Math.sqrt(MAX_RASTER_PIXELS / area)
  return Math.max(1, Math.min(MAX_ZOOM_FACTOR, budgeted))
}

export function minScale(natural: Size, stage: Size, rotation = 0): number {
  return Math.min(fitScale(natural, stage, rotation), 1) * 0.5
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/** Rendered size of the image on screen under a given transform. */
export function renderedSize(natural: Size, t: Transform): Size {
  const o = orientedSize(natural, t.rotation)
  return { width: o.width * t.scale, height: o.height * t.scale }
}

/**
 * Zoom while holding one point fixed under the cursor or the pinch midpoint.
 * `origin` is in stage coordinates, relative to the stage centre.
 */
export function zoomAbout(t: Transform, nextScale: number, origin: { x: number; y: number }): Transform {
  const ratio = nextScale / t.scale
  return {
    ...t,
    scale: nextScale,
    x: origin.x - (origin.x - t.x) * ratio,
    y: origin.y - (origin.y - t.y) * ratio,
  }
}
