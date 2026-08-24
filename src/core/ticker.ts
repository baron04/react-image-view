export type TickFn = (dtMs: number) => boolean

/**
 * One animation frame loop for the whole viewer.
 *
 * Four kinds of motion can be in flight at once — the open transition, a zoom
 * settling, pan inertia, a page snapping into place — and each writing its own
 * `style.transform` from its own rAF would mean the last writer of the frame
 * wins. Routing them through a single loop makes the order explicit, and gives
 * `cancelAll` somewhere to stand: a finger going down stops everything, because
 * taking hold of a moving image has to feel immediate rather than queued behind
 * whatever was already playing.
 */
export class Ticker {
  private fns = new Set<TickFn>()
  private frame: number | null = null
  private last = 0

  add(fn: TickFn): () => void {
    this.fns.add(fn)
    this.start()
    return () => this.fns.delete(fn)
  }

  cancelAll(): void {
    this.fns.clear()
    this.stop()
  }

  get running(): boolean {
    return this.frame !== null
  }

  private start(): void {
    if (this.frame !== null) return
    this.last = performance.now()
    this.frame = requestAnimationFrame(this.step)
  }

  private stop(): void {
    if (this.frame === null) return
    cancelAnimationFrame(this.frame)
    this.frame = null
  }

  private step = (now: number): void => {
    // A backgrounded tab resumes with a huge gap; clamping keeps a spring from
    // integrating one enormous step and flinging the image off screen.
    const dt = Math.min(now - this.last, 64)
    this.last = now

    for (const fn of [...this.fns]) {
      if (!fn(dt)) this.fns.delete(fn)
    }

    this.frame = this.fns.size > 0 ? requestAnimationFrame(this.step) : null
  }
}
