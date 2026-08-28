import { afterEach, describe, expect, it } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { ImageView, useViewer, type ImageItem } from '../index'
import { ImagePreview } from '../imperative'
import { resetImagePreviewForTests } from '../preset/ImagePreview'

const A = { src: 'a.png', name: 'a.png', width: 100, height: 100 }
const B = { src: 'b.png', name: 'b.png', width: 100, height: 100 }
const C = { src: 'c.png', name: 'c.png', width: 100, height: 100 }
const IMAGES: ImageItem[] = [A, B, C]

afterEach(() => resetImagePreviewForTests())

async function open(images = IMAGES, index = 0) {
  let handle!: ReturnType<typeof ImagePreview.open>
  await act(async () => {
    handle = ImagePreview.open({ images, index })
  })
  return handle
}

describe('ImagePreview', () => {
  it('opens directly at the requested image without a Provider', async () => {
    await open(IMAGES, 1)

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('b.png')
  })

  it('navigates, clamps indices, and closes through its handle', async () => {
    const preview = await open(IMAGES, 1)

    act(() => preview.prev())
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('a.png')

    act(() => preview.next())
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('b.png')

    act(() => preview.go(99))
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('c.png')

    act(() => preview.close())
    await waitFor(() => expect(document.querySelector('[data-image-preview-host]')).toBeNull())
    expect(document.querySelector('dialog[data-image-view]')).toBeNull()
  })

  it('queues handle commands issued before the lazy root mounts', async () => {
    await act(async () => {
      const preview = ImagePreview.open({ images: IMAGES })
      preview.next()
    })

    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('b.png')
  })

  it('automatically destroys the host when the built-in close button is used', async () => {
    await open()

    act(() => screen.getByLabelText('Close').click())

    await waitFor(() => expect(document.querySelector('[data-image-preview-host]')).toBeNull())
  })

  it('replaces the active viewer and makes old handles harmless', async () => {
    const old = await open([A])
    const current = await open([C])

    act(() => old.close())
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('c.png')

    act(() => current.close())
    await waitFor(() => expect(document.querySelector('[data-image-preview-host]')).toBeNull())
  })

  it('collapses multiple synchronous opens to the last viewer', async () => {
    await act(async () => {
      ImagePreview.open({ images: [A] })
      ImagePreview.open({ images: [C] })
    })

    expect(document.querySelectorAll('[data-image-preview-host]')).toHaveLength(1)
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('c.png')
  })

  it('keeps the active viewer closed for an empty replacement', async () => {
    await open()

    act(() => {
      ImagePreview.open({ images: [] })
    })

    expect(document.querySelector('[data-image-preview-host]')).toBeNull()
    expect(document.querySelector('dialog[data-image-view]')).toBeNull()
  })

  it('can close the active viewer through the static method', async () => {
    await open()

    act(() => ImagePreview.close())

    await waitFor(() => expect(document.querySelector('[data-image-preview-host]')).toBeNull())
  })

  it('accepts composed content and keeps useViewer available', async () => {
    function Readout() {
      const viewer = useViewer()
      return <div data-testid="readout">{`${viewer.index + 1}/${viewer.total}`}</div>
    }

    await act(async () => {
      ImagePreview.open({
        images: IMAGES,
        index: 1,
        content: (
          <ImageView.Content>
            <Readout />
          </ImageView.Content>
        ),
      })
    })

    expect(screen.getByTestId('readout').textContent).toBe('2/3')
  })

  it('passes safe image plumbing through renderImage', async () => {
    await act(async () => {
      ImagePreview.open({
        images: [A],
        renderImage: ({ item, imageProps }) => (
          <picture data-testid="picture">
            <source srcSet={`${item.src}.webp`} type="image/webp" />
            <img {...imageProps} data-testid="custom-image" referrerPolicy="no-referrer" />
          </picture>
        ),
      })
    })

    const image = screen.getByTestId('custom-image')
    expect(image.getAttribute('src')).toBe('a.png')
    expect(image.getAttribute('referrerpolicy')).toBe('no-referrer')

    fireEvent.load(image)
    expect(document.querySelector('[data-image-view-loading]')).toBeNull()
  })
})
