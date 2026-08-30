import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as Viewer from '../primitives'

const image = { src: 'a.png', alt: 'a', width: 100, height: 100 }

describe('primitives entry', () => {
  it('never injects preset content', () => {
    render(
      <Viewer.Group images={[image]} defaultOpen>
        <Viewer.ImageView index={0} {...image}>
          <button>open</button>
        </Viewer.ImageView>
      </Viewer.Group>,
    )

    expect(document.querySelector('dialog[data-image-view]')).toBeNull()
    expect(document.querySelector('[data-image-view-control="zoom-in"]')).toBeNull()
  })

  it('renders only explicitly composed content', () => {
    render(
      <Viewer.Group images={[image]} defaultOpen>
        <Viewer.Content>
          <span data-testid="custom">custom</span>
        </Viewer.Content>
      </Viewer.Group>,
    )

    expect(screen.getByTestId('custom')).toBeTruthy()
    expect(document.querySelector('[data-image-view-control="zoom-in"]')).toBeNull()
  })
})
