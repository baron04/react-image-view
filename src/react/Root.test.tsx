import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { ImageView, useViewer, useLabels } from '../index'

/**
 * Contract tests for the React layer.
 *
 * This is the half of the codebase where both bugs that reached npm actually
 * lived — pointer capture swallowing toolbar clicks, and the trigger registry
 * never re-rendering Root — while all 60 unit tests sat in `core/`. These
 * cover the seams the e2e suite is too coarse to reach: controlled vs
 * uncontrolled state, the registry fallback, label merging, and asChild.
 */

// Named rather than reached for by index: `noUncheckedIndexedAccess` types
// `IMAGES[0]` as possibly undefined, which makes spreading it a type error.
const A = { src: 'a.png', name: 'a.png', width: 100, height: 100 }
const B = { src: 'b.png', name: 'b.png', width: 100, height: 100 }
const C = { src: 'c.png', name: 'c.png', width: 100, height: 100 }
const IMAGES = [A, B, C]

function viewerRect(this: Element): DOMRect {
  const width = this.hasAttribute('data-image-view-stage') ? 800 : 100
  const height = this.hasAttribute('data-image-view-stage') ? 600 : 100
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect
}

function openViewer(index = 0) {
  act(() => {
    screen.getByTestId(`trigger-${index}`).click()
  })
}

function Triggers({ images = IMAGES }: { images?: typeof IMAGES }) {
  return (
    <>
      {images.map((img, i) => (
        <ImageView.Trigger key={img.src} index={i} {...img}>
          <img src={img.src} alt={img.name} data-testid={`trigger-${i}`} />
        </ImageView.Trigger>
      ))}
    </>
  )
}

describe('SingleImage (L1)', () => {
  it('forwards renderImage to the full-size image', () => {
    render(
      <ImageView
        {...A}
        renderImage={({ item, imageProps }) => (
          <img {...imageProps} data-testid="full-size-image" data-source={item.src} />
        )}
      >
        <img src={A.src} alt={A.name} data-testid="single-trigger" />
      </ImageView>,
    )

    fireEvent.click(screen.getByTestId('single-trigger'))

    const image = screen.getByTestId('full-size-image')
    const media = image.closest('[data-current]')?.firstElementChild as HTMLElement | null
    const crop = media?.firstElementChild as HTMLElement | null

    expect(image.getAttribute('data-source')).toBe(A.src)
    expect(media).not.toBeNull()
    expect(crop).not.toBeNull()
    // Keep these on separate HTML layers. Combining transform and clip-path on
    // a large image can make Chromium drop frames or briefly paint blank.
    expect(media?.style.transform).not.toBe('')
    expect(image.style.transform).toBe('')
    expect(image.style.clipPath).toBe('')
  })

  it('reveals a delayed image without replaying the opening flight', () => {
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(viewerRect)
    let loadingDeadline: TimerHandler | undefined
    const deadline = vi.spyOn(window, 'setTimeout').mockImplementation((callback) => {
      loadingDeadline = callback
      return 1
    })
    const frame = vi.spyOn(window, 'requestAnimationFrame')
    render(
      <ImageView src={A.src} width={A.width} height={A.height}>
        <button>preview</button>
      </ImageView>,
    )
    fireEvent.click(screen.getByText('preview'))

    const image = document.querySelector<HTMLImageElement>(
      '[data-image-view-slide][data-current] img',
    )!
    expect(image.style.visibility).toBe('hidden')
    // Let the decode grace period pass: loading is now a sustained state
    // rather than a cache hit whose load event arrived slightly late.
    act(() => {
      if (typeof loadingDeadline === 'function') loadingDeadline()
    })
    frame.mockClear()
    fireEvent.load(image)
    expect(image.style.visibility).toBe('')
    // Loading completion reveals the fitted image directly; it must not start
    // a delayed shared-element flight from the thumbnail.
    expect(frame).not.toHaveBeenCalled()
    deadline.mockRestore()
    frame.mockRestore()
    rect.mockRestore()
  })

  it('keeps the opening flight when decoding finishes within the grace period', () => {
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(viewerRect)
    const deadline = vi.spyOn(window, 'setTimeout').mockImplementation(() => 1)
    const frame = vi.spyOn(window, 'requestAnimationFrame')
    render(
      <ImageView src={A.src} width={A.width} height={A.height}>
        <button>preview</button>
      </ImageView>,
    )
    fireEvent.click(screen.getByText('preview'))

    const image = document.querySelector<HTMLImageElement>(
      '[data-image-view-slide][data-current] img',
    )!
    frame.mockClear()
    fireEvent.load(image)
    expect(frame).toHaveBeenCalled()

    frame.mockRestore()
    deadline.mockRestore()
    rect.mockRestore()
  })
})

describe('Root: open state', () => {
  it('is closed until a trigger is activated', () => {
    render(
      <ImageView.Root images={IMAGES}>
        <Triggers />
      </ImageView.Root>,
    )
    expect(document.querySelector('dialog[data-image-view]')).toBeNull()

    openViewer()
    expect(document.querySelector('dialog[data-image-view]')).not.toBeNull()
  })

  it('opens on the trigger that was activated, not always the first', () => {
    render(
      <ImageView.Root images={IMAGES}>
        <Triggers />
      </ImageView.Root>,
    )
    openViewer(2)
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('c.png')
  })

  it('respects defaultOpen', () => {
    render(
      <ImageView.Root images={IMAGES} defaultOpen>
        <Triggers />
      </ImageView.Root>,
    )
    expect(document.querySelector('dialog[data-image-view]')).not.toBeNull()
  })

  it('stays shut when `open` is controlled and the parent does not agree', () => {
    const onOpenChange = vi.fn()
    render(
      <ImageView.Root images={IMAGES} open={false} onOpenChange={onOpenChange}>
        <Triggers />
      </ImageView.Root>,
    )

    openViewer()

    // The request is reported, but a controlled component must not move on
    // its own — the parent owns the value.
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(document.querySelector('dialog[data-image-view]')).toBeNull()
  })

  it('reports index changes without moving when `index` is controlled', () => {
    const onIndexChange = vi.fn()
    render(
      <ImageView.Root images={IMAGES} open index={0} onIndexChange={onIndexChange}>
        <Triggers />
      </ImageView.Root>,
    )

    act(() => {
      document.querySelector<HTMLButtonElement>('[data-image-view-control="next"]')?.click()
    })

    expect(onIndexChange).toHaveBeenCalledWith(1)
    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('a.png')
  })
})

describe('Root: images from registered triggers (L2)', () => {
  it('derives the set from triggers when no images prop is given', () => {
    // The regression this guards: registering was a plain ref push with no
    // state behind it, so Root never re-rendered and `total` stayed at 0.
    render(
      <ImageView.Root>
        <Triggers />
        <ImageView.DefaultContent counter />
      </ImageView.Root>,
    )

    openViewer(1)
    expect(document.querySelector('[data-image-view-counter]')?.textContent).toBe('2 / 3')
  })

  it('picks up a trigger that mounts later', () => {
    function Late() {
      const [extra, setExtra] = React.useState(false)
      return (
        <ImageView.Root>
          <Triggers images={IMAGES.slice(0, 2)} />
          {extra && (
            <ImageView.Trigger index={2} src="c.png" name="c.png">
              <img src="c.png" alt="c" data-testid="trigger-2" />
            </ImageView.Trigger>
          )}
          <button data-testid="add" onClick={() => setExtra(true)}>
            add
          </button>
          <ImageView.DefaultContent counter />
        </ImageView.Root>
      )
    }

    render(<Late />)
    act(() => {
      screen.getByTestId('add').click()
    })
    openViewer(0)

    expect(document.querySelector('[data-image-view-counter]')?.textContent).toBe('1 / 3')
  })

  it('uses explicit indices rather than asynchronous mount order', () => {
    function OutOfOrder() {
      const [first, setFirst] = React.useState(false)
      return (
        <ImageView.Root>
          <ImageView.Trigger index={1} {...B}>
            <img src={B.src} alt={B.name} data-testid="trigger-1" />
          </ImageView.Trigger>
          {first && (
            <ImageView.Trigger index={0} {...A}>
              <img src={A.src} alt={A.name} data-testid="trigger-0" />
            </ImageView.Trigger>
          )}
          <button data-testid="mount-first" onClick={() => setFirst(true)}>
            mount first
          </button>
          <ImageView.DefaultContent counter />
        </ImageView.Root>
      )
    }

    render(<OutOfOrder />)
    fireEvent.click(screen.getByTestId('mount-first'))
    openViewer(0)

    expect(document.querySelector('[data-image-view-title]')?.textContent).toBe('a.png')
    expect(document.querySelector('[data-image-view-counter]')?.textContent).toBe('1 / 2')
  })

  it('refreshes registered metadata when downloadUrl changes', () => {
    function MutableItem() {
      const [downloadUrl, setDownloadUrl] = React.useState('/first.png')
      return (
        <ImageView.Root>
          <ImageView.Trigger index={0} {...A} downloadUrl={downloadUrl}>
            <img src={A.src} alt={A.name} data-testid="trigger-0" />
          </ImageView.Trigger>
          <button data-testid="update-url" onClick={() => setDownloadUrl('/second.png')}>
            update
          </button>
        </ImageView.Root>
      )
    }

    render(<MutableItem />)
    fireEvent.click(screen.getByTestId('update-url'))
    openViewer()

    expect(
      document.querySelector<HTMLAnchorElement>('[data-image-view-control="download"]')?.pathname,
    ).toBe('/second.png')
  })
})

describe('Root: labels', () => {
  it('ships English defaults', () => {
    render(
      <ImageView.Root images={IMAGES} defaultOpen>
        <Triggers />
      </ImageView.Root>,
    )
    const dialog = document.querySelector('dialog[data-image-view]')
    expect(dialog?.getAttribute('aria-label')).toBe('Image viewer')
    expect(
      document.querySelector('[data-image-view-control="zoom-in"]')?.getAttribute('aria-label'),
    ).toBe('Zoom in')
  })

  it('merges an override field by field, leaving the rest alone', () => {
    render(
      <ImageView.Root images={IMAGES} defaultOpen labels={{ close: 'Fermer' }}>
        <Triggers />
      </ImageView.Root>,
    )
    expect(
      document.querySelector('[data-image-view-control="close"]')?.getAttribute('aria-label'),
    ).toBe('Fermer')
    // Untouched keys must keep the default rather than becoming undefined.
    expect(
      document.querySelector('[data-image-view-control="zoom-in"]')?.getAttribute('aria-label'),
    ).toBe('Zoom in')
  })

  it('exposes the resolved set to custom controls through useLabels', () => {
    function Custom() {
      const labels = useLabels()
      return <span data-testid="custom">{labels.close}</span>
    }
    render(
      <ImageView.Root images={IMAGES} defaultOpen labels={{ close: 'Fermer' }}>
        <Triggers />
        <ImageView.Content>
          <Custom />
        </ImageView.Content>
      </ImageView.Root>,
    )
    expect(screen.getByTestId('custom').textContent).toBe('Fermer')
  })
})

describe('Trigger: keyboard access', () => {
  it('gives a non-interactive child button semantics', () => {
    render(
      <ImageView.Root images={IMAGES}>
        <Triggers />
      </ImageView.Root>,
    )
    const trigger = screen.getByTestId('trigger-0')
    expect(trigger.getAttribute('role')).toBe('button')
    expect(trigger.getAttribute('tabindex')).toBe('0')
  })

  it('leaves an already-interactive child alone', () => {
    render(
      <ImageView.Root images={IMAGES}>
        <ImageView.Trigger index={0} {...A}>
          <button data-testid="native">open</button>
        </ImageView.Trigger>
      </ImageView.Root>,
    )
    const trigger = screen.getByTestId('native')
    // A <button> is already focusable and already activates on Enter; adding
    // a role would fight its semantics and a key handler would double-fire.
    expect(trigger.getAttribute('role')).toBeNull()
    expect(trigger.getAttribute('tabindex')).toBeNull()
  })

  it('does not overrule a tabIndex the caller set themselves', () => {
    render(
      <ImageView.Root images={IMAGES}>
        <ImageView.Trigger index={0} {...A}>
          <div tabIndex={-1} data-testid="own">
            mine
          </div>
        </ImageView.Trigger>
      </ImageView.Root>,
    )
    expect(screen.getByTestId('own').getAttribute('tabindex')).toBe('-1')
  })

  it('opens once on Enter, not twice', () => {
    render(
      <ImageView.Root images={IMAGES}>
        <Triggers />
      </ImageView.Root>,
    )
    act(() => {
      screen
        .getByTestId('trigger-0')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(document.querySelectorAll('dialog[data-image-view]')).toHaveLength(1)
  })

  it('does not open when disabled', () => {
    render(
      <ImageView.Root images={IMAGES}>
        <ImageView.Trigger index={0} disabled {...A}>
          <img src="a.png" alt="a" data-testid="trigger-0" />
        </ImageView.Trigger>
      </ImageView.Root>,
    )
    openViewer()
    expect(document.querySelector('dialog[data-image-view]')).toBeNull()
  })

  it('lets the child prevent the viewer from opening', () => {
    render(
      <ImageView.Root images={IMAGES}>
        <ImageView.Trigger index={0} {...A}>
          <button data-testid="guarded" onClick={(event) => event.preventDefault()}>
            guarded
          </button>
        </ImageView.Trigger>
      </ImageView.Root>,
    )

    fireEvent.click(screen.getByTestId('guarded'))
    expect(document.querySelector('dialog[data-image-view]')).toBeNull()
  })
})

describe('Content: composition', () => {
  it('supplies DefaultContent when none is written (L2)', () => {
    render(
      <ImageView.Root images={IMAGES} defaultOpen>
        <Triggers />
      </ImageView.Root>,
    )
    expect(document.querySelector('[data-image-view-control="zoom-in"]')).not.toBeNull()
  })

  it('adds nothing of its own once a Content is present (L3)', () => {
    render(
      <ImageView.Root images={IMAGES} defaultOpen>
        <Triggers />
        <ImageView.Content>
          <span data-testid="mine">mine</span>
        </ImageView.Content>
      </ImageView.Root>,
    )
    expect(screen.getByTestId('mine')).toBeTruthy()
    // The default toolbar must not appear alongside a hand-written layout.
    expect(document.querySelector('[data-image-view-control="zoom-in"]')).toBeNull()
    expect(document.querySelectorAll('dialog[data-image-view]')).toHaveLength(1)
  })

  it('announces the current slide through a live region', () => {
    render(
      <ImageView.Root images={IMAGES} defaultOpen>
        <Triggers />
      </ImageView.Root>,
    )
    const announcer = document.querySelector('[data-image-view-announcer]')
    expect(announcer?.getAttribute('aria-live')).toBe('polite')
    expect(announcer?.textContent).toBe('a.png (1 / 3)')
  })

  it('renders a compact, labelled retry action on image failure', () => {
    render(
      <ImageView.Root images={IMAGES} defaultOpen>
        <Triggers />
      </ImageView.Root>,
    )

    const image = document.querySelector<HTMLImageElement>(
      '[data-image-view-slide][data-current] img',
    )
    expect(image).not.toBeNull()
    fireEvent.error(image!)

    const alert = screen.getByRole('alert')
    const retry = screen.getByRole('button', { name: 'Try again' })
    expect(alert.textContent).toBe("This image couldn't be loaded")
    expect(retry.getAttribute('title')).toBe('Try again')
    expect(retry.textContent).toBe('')
    expect(alert.querySelector('[data-image-view-control="download"]')).toBeNull()

    fireEvent.click(retry)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy()
  })

  it('keeps the page locked until the last viewer closes', () => {
    function Pair({ first, second }: { first: boolean; second: boolean }) {
      return (
        <>
          <ImageView.Root images={[A]} open={first} />
          <ImageView.Root images={[B]} open={second} />
        </>
      )
    }

    document.body.style.overflow = 'auto'
    const view = render(<Pair first second />)
    expect(document.body.style.overflow).toBe('hidden')

    view.rerender(<Pair first={false} second />)
    expect(document.body.style.overflow).toBe('hidden')

    view.rerender(<Pair first={false} second={false} />)
    expect(document.body.style.overflow).toBe('auto')
    document.body.style.overflow = ''
  })
})

describe('Stage: continuous input', () => {
  function Readout() {
    const viewer = useViewer()
    return (
      <output data-testid="transform">
        {viewer.scale},{viewer.transform.x},{viewer.transform.y}
      </output>
    )
  }

  function ComposedViewer() {
    const image = { src: 'large.png', name: 'large.png', width: 2000, height: 1500 }
    return (
      <ImageView.Root images={[image]} defaultOpen>
        <ImageView.Content>
          <ImageView.Stage>
            <ImageView.Image />
            <Readout />
          </ImageView.Stage>
        </ImageView.Content>
      </ImageView.Root>
    )
  }

  function stageRect(this: Element): DOMRect {
    if (this.hasAttribute('data-image-view-stage')) {
      return {
        x: 100,
        y: 50,
        left: 100,
        top: 50,
        right: 900,
        bottom: 650,
        width: 800,
        height: 600,
        toJSON: () => ({}),
      } as DOMRect
    }
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    } as DOMRect
  }

  it('publishes wheel zoom to useViewer on the next frame', async () => {
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(stageRect)
    render(<ComposedViewer />)
    const stage = document.querySelector('[data-image-view-stage]')!

    await waitFor(() =>
      expect(Number(screen.getByTestId('transform').textContent!.split(',')[0])).toBeCloseTo(0.4),
    )
    const before = Number(screen.getByTestId('transform').textContent!.split(',')[0])
    fireEvent(stage, new WheelEvent('wheel', { deltaY: -100, clientX: 500, clientY: 350 }))

    await waitFor(() =>
      expect(Number(screen.getByTestId('transform').textContent!.split(',')[0])).toBeGreaterThan(
        before,
      ),
    )
    rect.mockRestore()
  })

  it('computes pinch origin in Stage-local coordinates', async () => {
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(stageRect)
    render(<ComposedViewer />)
    const stage = document.querySelector('[data-image-view-stage]')!
    await waitFor(() =>
      expect(Number(screen.getByTestId('transform').textContent!.split(',')[0])).toBeCloseTo(0.4),
    )

    fireEvent.pointerDown(stage, { pointerId: 1, pointerType: 'touch', clientX: 400, clientY: 350 })
    fireEvent.pointerDown(stage, { pointerId: 2, pointerType: 'touch', clientX: 600, clientY: 350 })
    fireEvent.pointerMove(stage, { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 350 })
    fireEvent.pointerMove(stage, { pointerId: 2, pointerType: 'touch', clientX: 700, clientY: 350 })
    fireEvent.pointerUp(stage, { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 350 })
    fireEvent.pointerUp(stage, { pointerId: 2, pointerType: 'touch', clientX: 700, clientY: 350 })

    await waitFor(() => {
      const [, x] = screen.getByTestId('transform').textContent!.split(',').map(Number)
      expect(x).toBeCloseTo(0, 5)
    })
    rect.mockRestore()
  })
})

describe('useViewer', () => {
  it('reports position and drives navigation', () => {
    function Readout() {
      const v = useViewer()
      return (
        <button data-testid="readout" onClick={v.next}>
          {v.index + 1}/{v.total}
        </button>
      )
    }
    render(
      <ImageView.Root images={IMAGES} defaultOpen>
        <Triggers />
        <ImageView.Content>
          <Readout />
        </ImageView.Content>
      </ImageView.Root>,
    )

    expect(screen.getByTestId('readout').textContent).toBe('1/3')
    act(() => {
      screen.getByTestId('readout').click()
    })
    expect(screen.getByTestId('readout').textContent).toBe('2/3')
  })

  it('throws a named error outside Root rather than failing obscurely', () => {
    function Orphan() {
      useViewer()
      return null
    }
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Orphan />)).toThrow(/must be rendered inside/i)
    quiet.mockRestore()
  })
})
