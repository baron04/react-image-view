/**
 * Every hand-picked constant that shapes how the viewer feels, in one place.
 *
 * These were chosen by reasoning about the physics and by driving synthetic
 * and real touch/pointer events through a browser — see the commit history
 * for the specific defects each value fixes. What has NOT happened is a pass
 * on a physical phone with a human thumb: latency, screen size, and finger
 * friction all change how a threshold feels in a way no amount of synthetic
 * event replay can substitute for. If a gesture feels wrong on real hardware,
 * this file is the one place to look — change a number here rather than
 * hunting through the reducer or the animation drivers for it.
 */

export const tuning = {
  /** Pixels of movement before an undecided drag commits to panning, paging,
   *  or dismissing. Too low and a tap-and-hold jitters into a drag; too high
   *  and the gesture feels laggy to start. */
  intentThreshold: 8,

  /**
   * Pixels a pan must overshoot a bounds edge before control passes to the
   * pager. Large enough that a pan ending at the edge does not turn the page
   * by accident; small enough that deliberately continuing feels like one
   * motion. This is the number most worth re-checking by hand: it is a
   * judgment call about where "still panning" ends and "now paging" begins,
   * and that judgment was made without a thumb on real glass.
   */
  handoffThreshold: 40,

  page: {
    /** Fraction of the stage width a drag must cover to commit a page turn
     *  on release, absent a fast flick. */
    commitRatio: 0.5,
    /** Flick speed (px/ms) that commits a page turn regardless of distance,
     *  provided it agrees with the drag's direction. */
    commitVelocity: 0.4,
  },

  dismiss: {
    /** Fraction of the stage height a pull-down must cover to close on
     *  release. Deliberately higher than a page turn's ratio — a downward
     *  drag while reading is a common accident, and losing the reader's
     *  place to it is worse than a page turn firing early. */
    commitRatio: 0.35,
    /** Flick speed (px/ms) that can close the viewer early, but only once
     *  the drag has also covered `flickMinProgress` of the distance —
     *  speed alone must never be enough, or any brisk downward swipe closes
     *  the viewer by accident. */
    commitVelocity: 1.6,
    flickMinProgress: 0.5,
  },

  spring: {
    /** How hard a command (a button, a keystroke) pulls the transform to its
     *  target. Critically damped settling takes roughly 6/sqrt(stiffness)
     *  seconds, so 340 is a little over a third of a second — quick enough
     *  a press feels answered, slow enough to still read as motion. */
    settleStiffness: 340,
    /** The close flight runs harder than everything else: an entrance shows
     *  where the image came from, so it can take its time; an exit is
     *  getting out of the way, and anything lingering there reads as a
     *  stall. ~3600 settles in well under 100ms. */
    exitStiffness: 3600,
    /**
     * Longest slice the spring integrator advances in one step (seconds).
     * Explicit integration of a stiff spring is only stable below roughly
     * 2/sqrt(stiffness); a dropped frame or a backgrounded tab hands it a
     * step far longer than that, and without sub-stepping the value
     * amplifies instead of settling — the image flew to 38,000px wide in
     * testing. 1/240s keeps every slice stable regardless of stiffness.
     */
    maxSubstepSeconds: 1 / 240,
  },

  fling: {
    /** How fast released velocity bleeds off. Glide distance after a flick
     *  is roughly velocity/friction, so this is the number to raise if a
     *  throw travels further than it should, or lower if it stops too
     *  abruptly. */
    friction: 9,
    /** Below this speed (px/ms) a release is a stop, not a throw — without a
     *  floor, even a slow lift-off carried a small unwanted drift. */
    minVelocity: 0.08,
  },

  zoom: {
    /** Hard ceiling on magnification, however small the image — keeps a tiny
     *  screenshot from being zoomed into pure abstraction. The real ceiling
     *  is almost always the raster budget below, not this. */
    maxFactor: 16,
    /** Rasterised-pixel budget the zoom ceiling is derived from (see
     *  `maxScale` in transform.ts). Scaling an <img> past this makes the
     *  compositor re-rasterise a layer large enough to exhaust GPU memory on
     *  some devices; roughly an 8000×8000 layer. */
    maxRasterPixels: 64_000_000,
    /** Rate a trackpad pinch (ctrl+wheel) zooms at, per unit of wheel delta.
     *  Trackpads vary a lot between vendors and OSes — this is the one value
     *  in this file most likely to need adjusting per-platform, and the
     *  hardest to get right without trying several real trackpads. */
    trackpadRate: 0.02,
  },
} as const
