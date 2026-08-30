import { describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ImageView } from '../index'
import zhCN from '../locales/zh-CN'

/**
 * Browser language is intentionally irrelevant: applications choose their
 * locale explicitly, which keeps server and hydrated output deterministic.
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
    <ImageView index={0} {...A}>
      <img src={A.src} alt={A.name} data-testid="trigger-0" />
    </ImageView>
  )
}

describe('Group: explicit locale', () => {
  it('keeps stable English defaults regardless of browser language', () => {
    render(
      <ImageView.Group images={[A]}>
        <Trigger />
      </ImageView.Group>,
    )
    openViewer()
    expect(
      document.querySelector('[data-image-view-control="close"]')?.getAttribute('aria-label'),
    ).toBe('Close')
  })

  it('accepts an opt-in locale with field-level overrides', () => {
    render(
      <ImageView.Group images={[A]} labels={{ ...zhCN, close: 'Fermer' }}>
        <Trigger />
      </ImageView.Group>,
    )
    openViewer()
    const dialog = document.querySelector('[data-image-view-control="close"]')
    expect(dialog?.getAttribute('aria-label')).toBe('Fermer')
    // Untouched keys come from the explicitly selected pack.
    expect(
      document.querySelector('[data-image-view-control="zoom-in"]')?.getAttribute('aria-label'),
    ).toBe('放大')
  })
})
