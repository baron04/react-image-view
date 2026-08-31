import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTriggerRegistry } from './useTriggerRegistry'
import type { TriggerGeometry, TriggerRegistration } from './context'

const geometry = (y: number): TriggerGeometry =>
  ({ rect: { y } as DOMRect, fit: 'contain' }) as TriggerGeometry

function reg(id: string, index?: number, y = 0): TriggerRegistration {
  return {
    id,
    index,
    item: { src: `${id}.png`, name: `${id}.png` },
    getGeometry: () => geometry(y),
  }
}

describe('useTriggerRegistry', () => {
  it('uses the images prop as given and ignores registrations', () => {
    const images = [{ src: 'a.png' }, { src: 'b.png' }]
    const { result } = renderHook(() => useTriggerRegistry(images))

    act(() => {
      result.current.registerTrigger(reg('t1', 0))
    })

    expect(result.current.images).toBe(images)
  })

  it('derives images from registrations when no prop is given', () => {
    const { result } = renderHook(() => useTriggerRegistry(undefined))

    // The bug this guards: registering was a ref write and nothing else, so
    // the deriving memo never recomputed and `images` stayed empty forever.
    // Every usage in this repository passes `images`, which is how it hid.
    expect(result.current.images).toEqual([])

    act(() => {
      result.current.registerTrigger(reg('t1', 0))
    })
    expect(result.current.images.map((i) => i.src)).toEqual(['t1.png'])

    act(() => {
      result.current.registerTrigger(reg('t2', 1))
    })
    expect(result.current.images.map((i) => i.src)).toEqual(['t1.png', 't2.png'])
  })

  it('recomputes when a trigger unregisters', () => {
    const { result } = renderHook(() => useTriggerRegistry(undefined))
    let remove = () => {}

    act(() => {
      result.current.registerTrigger(reg('t1', 0))
      remove = result.current.registerTrigger(reg('t2', 1))
    })
    expect(result.current.images).toHaveLength(2)

    act(() => {
      remove()
    })
    expect(result.current.images.map((i) => i.src)).toEqual(['t1.png'])
  })

  it('orders by explicit index, not by the order things mounted', () => {
    const { result } = renderHook(() => useTriggerRegistry(undefined))

    // Mount order and visual order diverge in virtualised lists and anything
    // that streams in, which is the whole reason `index` is a prop.
    act(() => {
      result.current.registerTrigger(reg('third', 2))
      result.current.registerTrigger(reg('first', 0))
      result.current.registerTrigger(reg('second', 1))
    })

    expect(result.current.images.map((i) => i.src)).toEqual([
      'first.png',
      'second.png',
      'third.png',
    ])
    expect(result.current.indexOf('second')).toBe(1)
  })

  it('puts triggers without an index after the ones that have it', () => {
    const { result } = renderHook(() => useTriggerRegistry(undefined))

    act(() => {
      result.current.registerTrigger(reg('loose'))
      result.current.registerTrigger(reg('pinned', 0))
    })

    expect(result.current.images.map((i) => i.src)).toEqual(['pinned.png', 'loose.png'])
  })

  it('reports position zero for an id it does not know', () => {
    const { result } = renderHook(() => useTriggerRegistry(undefined))
    expect(result.current.indexOf('never-registered')).toBe(0)
  })

  it('measures geometry on demand rather than from registration time', () => {
    const { result } = renderHook(() => useTriggerRegistry(undefined))
    const getGeometry = vi.fn(() => geometry(42))

    act(() => {
      result.current.registerTrigger({ ...reg('t1', 0), getGeometry })
    })

    // Both flights measure through this, and the page may have scrolled since
    // the trigger mounted — a cached rect lands the animation in the wrong place.
    expect(getGeometry).not.toHaveBeenCalled()
    expect(result.current.getTriggerGeometry(0)?.rect.y).toBe(42)
    expect(getGeometry).toHaveBeenCalledTimes(1)
  })

  it('returns null for a slide with no trigger behind it', () => {
    const { result } = renderHook(() => useTriggerRegistry([{ src: 'a.png' }]))
    expect(result.current.getTriggerGeometry(0)).toBeNull()
  })
})
