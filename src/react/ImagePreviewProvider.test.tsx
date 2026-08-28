import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { ImageView, useViewer, type ImageItem } from '../index'
import { ImagePreviewProvider, useImagePreview } from '../imperative'

const A = { src: 'a.png', name: 'a.png', width: 100, height: 100 }
const B = { src: 'b.png', name: 'b.png', width: 100, height: 100 }
const C = { src: 'c.png', name: 'c.png', width: 100, height: 100 }
const IMAGES: ImageItem[] = [A, B, C]

function Commands() {
  const preview = useImagePreview()
  return (
    <div>
      <button onClick={() => preview.open({ images: IMAGES, index: 1 })}>open</button>
      <button onClick={() => preview.open({ images: [C] })}>replace</button>
      <button onClick={preview.prev}>prev</button>
      <button onClick={preview.next}>next</button>
      <button onClick={() => preview.go(99)}>last</button>
      <button onClick={preview.close}>close outside</button>
    </div>
  )
}

describe('ImagePreviewProvider', () => {
  it('opens from an arbitrary descendant at the requested image', () => {
    render(
      <ImagePreviewProvider>
        <section>
          <Commands />
        </section>
      </ImagePreviewProvider>,
    )

    act(() => screen.getByText('open').click())

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('b.png')
  })

  it('navigates, clamps indices, and closes through the controller', () => {
    render(
      <ImagePreviewProvider>
        <Commands />
      </ImagePreviewProvider>,
    )

    act(() => screen.getByText('open').click())
    act(() => screen.getByText('prev').click())
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('a.png')

    act(() => screen.getByText('next').click())
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('b.png')

    act(() => screen.getByText('last').click())
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('c.png')

    act(() => screen.getByText('close outside').click())
    expect(document.querySelector('dialog[data-image-view]')).toBeNull()
  })

  it('replaces the current image set when open is called again', () => {
    render(
      <ImagePreviewProvider>
        <Commands />
      </ImagePreviewProvider>,
    )

    act(() => screen.getByText('open').click())
    act(() => screen.getByText('replace').click())

    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('c.png')
    expect(
      document.querySelector('[data-image-view-control="next"]')?.hasAttribute('data-boundary'),
    ).toBe(true)
  })

  it('stays closed for an empty set', () => {
    function Empty() {
      const preview = useImagePreview()
      return <button onClick={() => preview.open({ images: [] })}>empty</button>
    }

    render(
      <ImagePreviewProvider>
        <Empty />
      </ImagePreviewProvider>,
    )
    act(() => screen.getByText('empty').click())
    expect(document.querySelector('dialog[data-image-view]')).toBeNull()
  })

  it('accepts composed content and keeps the declarative viewer API available', () => {
    function Readout() {
      const viewer = useViewer()
      return <div data-testid="readout">{`${viewer.index + 1}/${viewer.total}`}</div>
    }

    render(
      <ImagePreviewProvider
        content={
          <ImageView.Content>
            <Readout />
          </ImageView.Content>
        }
      >
        <Commands />
      </ImagePreviewProvider>,
    )

    act(() => screen.getByText('open').click())
    expect(screen.getByTestId('readout').textContent).toBe('2/3')
  })

  it('throws a named error outside the provider', () => {
    function Orphan() {
      useImagePreview()
      return null
    }
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Orphan />)).toThrow(/ImagePreviewProvider/)
    quiet.mockRestore()
  })
})
