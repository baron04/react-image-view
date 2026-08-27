import { describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ImageView } from '../index'

/**
 * `navigator.language` must be stubbed before the module under test ever
 * reads it — `Root`'s detector caches its result for the module's lifetime
 * (see the comment on `clientLabels` in Root.tsx), and vitest gives each test
 * file its own module registry, so this file is the only place that cache is
 * safe to poison with a non-English locale.
 */
vi.stubGlobal('navigator', { ...navigator, language: 'zh-CN' })

const A = { src: 'a.png', name: 'a.png', width: 100, height: 100 }

function openViewer() {
  act(() => {
    screen.getByTestId('trigger-0').click()
  })
}

function Trigger() {
  return (
    <ImageView.Trigger index={0} {...A}>
      <img src={A.src} alt={A.name} data-testid="trigger-0" />
    </ImageView.Trigger>
  )
}

describe('Root: labels auto-detected from the browser', () => {
  it('picks the matching bundled pack when no `labels` prop is given', () => {
    render(
      <ImageView.Root images={[A]}>
        <Trigger />
      </ImageView.Root>,
    )
    openViewer()
    expect(
      document.querySelector('[data-image-view-control="close"]')?.getAttribute('aria-label'),
    ).toBe('关闭')
  })

  it('still lets an explicit `labels` prop override the detected pack', () => {
    render(
      <ImageView.Root images={[A]} labels={{ close: 'Fermer' }}>
        <Trigger />
      </ImageView.Root>,
    )
    openViewer()
    const dialog = document.querySelector('[data-image-view-control="close"]')
    expect(dialog?.getAttribute('aria-label')).toBe('Fermer')
    // Untouched keys still fall back to the detected pack, not English.
    expect(
      document.querySelector('[data-image-view-control="zoom-in"]')?.getAttribute('aria-label'),
    ).toBe('放大')
  })
})
