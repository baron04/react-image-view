import { test, expect } from '@playwright/test'

/**
 * Visual regression for the states that only fail visibly.
 *
 * The FLIP flight's resting frame, the fitted scale, the cover-vs-contain
 * crop, the toolbar's active states — none of these are observable from a
 * `data-state` assertion, and all of them have broken at least once. A
 * screenshot diff is the only test that would have noticed.
 *
 * Always `?offline=1`: the generated SVG sheets are byte-identical every run,
 * where Lorem Picsum would produce a different photograph and fail every
 * comparison.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/?offline=1')
  await page.waitForSelector('[data-testid="default-thumb-0"]')
})

/**
 * Wait for the animation to stop moving rather than for a fixed duration.
 * Sleeping a guessed number of milliseconds is how a visual suite becomes
 * flaky on a slower CI machine.
 */
async function settled(page: import('@playwright/test').Page) {
  // Reset the tracking first. Without this the counter survives from the
  // previous call, so a second `settled()` in the same test could satisfy
  // itself on its first poll — before the new animation had even started —
  // and screenshot a frame mid-flight. That is exactly how this suite went
  // flaky the first time.
  await page.evaluate(() => {
    const w = window as unknown as { __last?: string; __stable?: number }
    w.__last = undefined
    w.__stable = 0
  })

  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-image-view-slide][data-current] > div')
      if (!el) return false
      const now = getComputedStyle(el).transform
      const w = window as unknown as { __last?: string; __stable?: number }
      w.__stable = now === w.__last ? (w.__stable ?? 0) + 1 : 0
      w.__last = now
      // Five consecutive identical frames. Three was enough to catch the
      // animation still running, but not enough to rule out the pause between
      // one animation finishing and the next being scheduled.
      return (w.__stable ?? 0) >= 5
    },
    null,
    { timeout: 10_000 },
  )
}

test('closed: the trigger grid', async ({ page }) => {
  await expect(page.locator('section.demo').first()).toHaveScreenshot('grid.png')
})

test('open: fitted to the window', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await settled(page)
  await expect(page.locator('dialog[data-image-view]')).toHaveScreenshot('fitted.png')
})

test('open: actual size, with the 1:1 control active', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await settled(page)
  await page.click('[data-image-view-control="actual-size"]')
  await settled(page)
  await expect(page.locator('dialog[data-image-view]')).toHaveScreenshot('actual-size.png')
})

test('open: rotated', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await settled(page)
  await page.click('[data-image-view-control="rotate-right"]')
  await settled(page)
  await expect(page.locator('dialog[data-image-view]')).toHaveScreenshot('rotated.png')
})

test('open: a wide image, where fit differs most from 1:1', async ({ page }) => {
  await page.click('[data-testid="default-thumb-1"]')
  await settled(page)
  await expect(page.locator('dialog[data-image-view]')).toHaveScreenshot('wide.png')
})

test('open: with the thumbnail strip and counter', async ({ page }) => {
  await page.click('[data-testid="gallery-thumb-0"]')
  await settled(page)
  await expect(page.locator('dialog[data-image-view]')).toHaveScreenshot('thumbnails.png')
})

test('open: at the end of the set, where prev/next go boundary', async ({ page }) => {
  await page.click('[data-testid="default-thumb-3"]')
  await settled(page)
  await expect(page.locator('dialog[data-image-view]')).toHaveScreenshot('last-slide.png')
})

test('open: on a phone-sized viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.click('[data-testid="default-thumb-0"]')
  await settled(page)
  await expect(page.locator('dialog[data-image-view]')).toHaveScreenshot('mobile.png')
})

test('open: in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.click('[data-testid="default-thumb-0"]')
  await settled(page)
  await expect(page.locator('dialog[data-image-view]')).toHaveScreenshot('dark.png')
})
