import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImageView } from '../primitives'

const image = { src: 'a.png', alt: 'a', width: 100, height: 100 }

describe('primitives entry', () => {
  it('never injects preset content', () => {
    render(
      <ImageView.Group images={[image]} defaultOpen>
        <ImageView index={0} {...image}>
          <button>open</button>
        </ImageView>
      </ImageView.Group>,
    )

    expect(document.querySelector('dialog[data-image-view]')).toBeNull()
    expect(document.querySelector('[data-image-view-control="zoom-in"]')).toBeNull()
  })

  it('renders only explicitly composed content', () => {
    render(
      <ImageView.Group images={[image]} defaultOpen>
        <ImageView.Content>
          <span data-testid="custom">custom</span>
        </ImageView.Content>
      </ImageView.Group>,
    )

    expect(screen.getByTestId('custom')).toBeTruthy()
    expect(document.querySelector('[data-image-view-control="zoom-in"]')).toBeNull()
  })
})

describe('entry shape', () => {
  it('exposes the same statics as the main entry, so one idiom covers both', async () => {
    const preset = await import('../index')

    // The asymmetry this guards against was real: for a while the two entries
    // needed different import styles, and the documentation had to teach a
    // namespace alias for one of them. Whatever the main entry hangs off
    // `ImageView`, the headless entry hangs off its own.
    const staticsOf = (c: object) =>
      Object.keys(c)
        .filter((k) => /^[A-Z]/.test(k))
        .sort()

    // `DefaultContent` is the one intended difference: it is the preset, so
    // the entry defined by not shipping the preset cannot carry it.
    expect(staticsOf(preset.ImageView)).toEqual([...staticsOf(ImageView), 'DefaultContent'].sort())
  })

  it('is still the trigger itself, not only a namespace', () => {
    expect(typeof ImageView).toBe('object')
    expect(ImageView.$$typeof).toBeDefined()
  })
})
