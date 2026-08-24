import type { Point } from '../types'

interface Sample extends Point {
  t: number
}

/**
 * Velocity from a short trailing window rather than the last two events.
 * A single frame pair is noisy, and on a flick the final events often
 * decelerate as the finger lifts — sampling a window keeps a deliberate
 * throw from being read as a stop.
 */
export class VelocityTracker {
  private samples: Sample[] = []

  constructor(private windowMs = 100) {}

  add(x: number, y: number, t: number = performance.now()): void {
    this.samples.push({ x, y, t })
    const cutoff = t - this.windowMs
    while (this.samples.length > 2 && this.samples[0]!.t < cutoff) this.samples.shift()
  }

  /** Pixels per millisecond. */
  velocity(): Point {
    if (this.samples.length < 2) return { x: 0, y: 0 }
    const first = this.samples[0]!
    const last = this.samples[this.samples.length - 1]!
    const dt = last.t - first.t
    if (dt <= 0) return { x: 0, y: 0 }
    return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt }
  }

  reset(): void {
    this.samples.length = 0
  }
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}
