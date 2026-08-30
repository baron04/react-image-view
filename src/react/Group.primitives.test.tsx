import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as ImageView from '../primitives'

const image = { src: 'a.png', alt: 'a', width: 100, height: 100 }

describe('primitives entry', () => {
  it('never injects preset content', () => {
    render(
      <ImageView.Group images={[image]} defaultOpen>
        <ImageView.Trigger index={0} {...image}>
          <button>open</button>
        </ImageView.Trigger>
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
