import { describe, expect, it } from 'vitest'
import {
  HANDOFF_THRESHOLD,
  createState,
  reduce,
  resolveIntent,
  type Command,
  type GestureContext,
  type GestureEvent,
  type GestureState,
} from './machine'
import { fitScale } from '../transform'
import type { Point, Transform } from '../types'

const NATURAL = { width: 2000, height: 1500 }
const STAGE = { width: 800, height: 600 }
const FIT = fitScale(NATURAL, STAGE) // 0.4

function context(over: Partial<GestureContext> = {}): GestureContext {
  return {
    stage: STAGE,
    natural: NATURAL,
    transform: { scale: FIT, x: 0, y: 0, rotation: 0 },
    fitScale: FIT,
    minScale: FIT * 0.5,
    maxScale: 4,
    canPrev: true,
    canNext: true,
    ...over,
  }
}

/** Replay a sequence, threading state through exactly as the binding would. */
function run(events: GestureEvent[], ctx: GestureContext, from?: GestureState) {
  let state = from ?? createState(ctx.transform)
  let commands: Command[] = []
  for (const event of events) {
    const result = reduce(state, event, ctx)
    state = result.state
    commands = result.commands
  }
  return { state, commands }
}

const down = (x: number, y: number, id = 1): GestureEvent => ({ type: 'pointerdown', id, x, y })
const move = (x: number, y: number, id = 1): GestureEvent => ({ type: 'pointermove', id, x, y })
const up = (velocity: Point = { x: 0, y: 0 }, id = 1): GestureEvent => ({ type: 'pointerup', id, velocity })

describe('resolveIntent', () => {
  it('always pans first when the image is zoomed', () => {
    const ctx = context({ transform: { scale: 1, x: 0, y: 0, rotation: 0 } })
    expect(resolveIntent({ x: 100, y: 0 }, ctx)).toBe('panning')
    expect(resolveIntent({ x: 0, y: 100 }, ctx)).toBe('panning')
  })

  it('splits horizontal from vertical at fit scale', () => {
    const ctx = context()
    expect(resolveIntent({ x: 40, y: 5 }, ctx)).toBe('paging')
    expect(resolveIntent({ x: 5, y: 40 }, ctx)).toBe('dismissing')
  })

  it('stays undecided below the threshold', () => {
    expect(resolveIntent({ x: 4, y: 4 }, context())).toBe('tracking')
  })
})

describe('a finger interrupts motion', () => {
  it('cancels running animations on pointerdown', () => {
    const { commands } = run([down(400, 300)], context())
    expect(commands).toContainEqual({ type: 'cancelAnimations' })
  })
})

describe('panning', () => {
  const zoomed: Transform = { scale: 0.8, x: 0, y: 0, rotation: 0 }
  const ctx = context({ transform: zoomed })

  it('moves the image while it still has room', () => {
    const { state } = run([down(400, 300), move(500, 300)], ctx)
    expect(state.phase).toBe('panning')
    expect(state.transform.x).toBe(100)
    expect(state.trackOffset).toBe(0)
  })

  it('clamps at the edge rather than running off', () => {
    // Slack is (2000*0.8 - 800)/2 = 400px each way.
    const { state } = run([down(400, 300), move(1400, 300)], ctx)
    expect(state.transform.x).toBeLessThanOrEqual(400 + 1e-6)
  })
})

describe('edge handoff', () => {
  // Start pinned to the right edge, so any further drag is overshoot.
  const atEdge: Transform = { scale: 0.8, x: 400, y: 0, rotation: 0 }
  const ctx = context({ transform: atEdge })

  it('resists but keeps panning below the threshold', () => {
    const { state } = run([down(400, 300), move(400 + (HANDOFF_THRESHOLD - 10), 300)], ctx)
    expect(state.phase).toBe('panning')
    expect(state.trackOffset).toBe(0)
    expect(Math.abs(state.overshoot)).toBeLessThanOrEqual(HANDOFF_THRESHOLD)
  })

  it('hands the drag to the pager past the threshold', () => {
    const { state } = run([down(400, 300), move(400 + HANDOFF_THRESHOLD + 10, 300)], ctx)
    expect(state.phase).toBe('paging')
  })

  it('carries the overshoot across, so the finger is never interrupted', () => {
    const overshoot = HANDOFF_THRESHOLD + 25
    const { state } = run([down(400, 300), move(400 + overshoot, 300)], ctx)
    // The pager picks up exactly where the pan gave out — restarting from zero
    // is what would be felt as a stutter mid-drag.
    expect(state.trackOffset).toBeCloseTo(overshoot, 5)
    expect(state.trackOffset).not.toBe(0)
  })

  it('keeps the track continuous across the handoff', () => {
    // The seam this whole mechanism exists to remove. Start 100px short of the
    // edge so the pan genuinely consumes part of the drag: only what comes
    // after may reach the track, and it has to arrive smoothly rather than
    // jumping by the distance the pan already used.
    const PAN_ROOM = 100
    const short = context({ transform: { scale: 0.8, x: 400 - PAN_ROOM, y: 0, rotation: 0 } })
    let state = createState(short.transform)
    const step = (x: number) => {
      state = reduce(state, { type: 'pointermove', id: 1, x, y: 300 }, short).state
      return state
    }
    state = reduce(state, down(400, 300), short).state

    // Still panning while the image has room.
    step(400 + PAN_ROOM - 10)
    expect(state.phase).toBe('panning')
    expect(state.trackOffset).toBe(0)

    const handoffAt = PAN_ROOM + HANDOFF_THRESHOLD + 10
    step(400 + handoffAt)
    expect(state.phase).toBe('paging')
    const atHandoff = state.trackOffset

    // The track carries only the overshoot, not the 100px the pan used.
    expect(Math.abs(atHandoff)).toBeCloseTo(HANDOFF_THRESHOLD + 10, 5)
    expect(Math.abs(atHandoff)).toBeLessThan(handoffAt)

    // And 20px more finger travel is 20px more track, no more.
    const after = step(400 + handoffAt + 20).trackOffset
    expect(after - atHandoff).toBeCloseTo(20, 5)
  })

  it('refuses to hand off when there is no page to turn to', () => {
    const noPrev = context({ transform: atEdge, canPrev: false })
    const { state } = run([down(400, 300), move(400 + HANDOFF_THRESHOLD + 50, 300)], noPrev)
    expect(state.phase).toBe('panning')
  })

  it('never reaches the pager while the image still has room', () => {
    const centred = context({ transform: { scale: 0.8, x: 0, y: 0, rotation: 0 } })
    const { state } = run([down(400, 300), move(700, 300)], centred)
    expect(state.phase).toBe('panning')
  })
})

describe('pinch', () => {
  const ctx = context()

  it('scales from the distance between two fingers', () => {
    const { state } = run(
      [down(300, 300, 1), down(500, 300, 2), move(200, 300, 1), move(600, 300, 2)],
      ctx,
    )
    expect(state.phase).toBe('pinching')
    // 200px apart to 400px apart doubles the scale.
    expect(state.transform.scale).toBeCloseTo(FIT * 2, 5)
  })

  it('respects the zoom ceiling', () => {
    const { state } = run(
      [down(390, 300, 1), down(410, 300, 2), move(0, 300, 1), move(800, 300, 2)],
      ctx,
    )
    expect(state.transform.scale).toBeLessThanOrEqual(ctx.maxScale)
  })

  it('continues as a pan when one finger lifts', () => {
    const { state } = run(
      [down(300, 300, 1), down(500, 300, 2), move(200, 300, 1), move(600, 300, 2), up({ x: 0, y: 0 }, 2)],
      ctx,
    )
    expect(state.phase).toBe('panning')
    expect(state.pointers).toHaveLength(1)
  })
})

describe('release', () => {
  const ctx = context()

  it('turns the page when the drag crosses half the stage', () => {
    const { commands } = run([down(600, 300), move(600 - 500, 300), up()], ctx)
    expect(commands).toContainEqual({ type: 'page', direction: 1 })
  })

  it('snaps back when the drag falls short', () => {
    const { commands } = run([down(600, 300), move(600 - 100, 300), up()], ctx)
    expect(commands).toContainEqual({ type: 'snapBack' })
  })

  it('turns the page on a short flick', () => {
    const { commands } = run([down(600, 300), move(600 - 120, 300), up({ x: -0.9, y: 0 })], ctx)
    expect(commands).toContainEqual({ type: 'page', direction: 1 })
  })

  it('treats a flick back against the drag as a cancellation', () => {
    const { commands } = run([down(600, 300), move(600 - 120, 300), up({ x: 0.9, y: 0 })], ctx)
    expect(commands).toContainEqual({ type: 'snapBack' })
  })

  it('stays put at the end of the set', () => {
    const last = context({ canNext: false })
    const { commands } = run([down(600, 300), move(600 - 500, 300), up()], last)
    expect(commands).toContainEqual({ type: 'snapBack' })
  })

  it('dismisses on a long pull down', () => {
    const { commands } = run([down(400, 200), move(400, 200 + 200), up()], ctx)
    expect(commands).toContainEqual({ type: 'dismiss' })
  })

  it('returns home when the pull down is short', () => {
    const { commands } = run([down(400, 200), move(400, 200 + 40), up()], ctx)
    expect(commands).toContainEqual({ type: 'cancelDismiss' })
  })

  it('flings a released pan', () => {
    const zoomed = context({ transform: { scale: 0.8, x: 0, y: 0, rotation: 0 } })
    const { commands } = run([down(400, 300), move(450, 300), up({ x: 0.6, y: 0 })], zoomed)
    expect(commands).toContainEqual({ type: 'flingPan', velocity: { x: 0.6, y: 0 } })
  })

  it('returns to idle with no pointers left', () => {
    const { state } = run([down(400, 300), move(450, 300), up()], ctx)
    expect(state.phase).toBe('idle')
    expect(state.pointers).toHaveLength(0)
  })
})
