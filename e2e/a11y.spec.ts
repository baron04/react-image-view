import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * The regression net for the accessibility work.
 *
 * Every failure these cover shipped in 0.1.x and survived several careful
 * review passes, because nothing mechanically checked for them: the trigger
 * was not reachable by keyboard at all, focus was never returned on close,
 * and the thumbnail strip claimed `role="tab"` without any of the tab
 * contract. Manual testing missed all three — partly because it is natural
 * to reach for the mouse, and partly because the keyboard shortcuts inside
 * the viewer worked fine, which made it look tested.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/?offline=1')
})

/** Tab until the predicate matches, so the test walks the real tab order. */
async function tabTo(page: import('@playwright/test').Page, selector: string, max = 25) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if (await page.locator(selector).evaluate((el) => el === document.activeElement).catch(() => false)) {
      return true
    }
  }
  return false
}

test('a thumbnail trigger is reachable in the tab order', async ({ page }) => {
  const trigger = page.locator('[data-testid="default-thumb-0"]')
  await expect(trigger).toBeVisible()

  // The trigger is the <figure>/<img> the caller supplied — Trigger has to
  // give it button semantics, since neither is focusable on its own.
  await expect(trigger).toHaveAttribute('tabindex', '0')
  await expect(trigger).toHaveAttribute('role', 'button')
})

test('Enter on a focused trigger opens the viewer', async ({ page }) => {
  const found = await tabTo(page, '[data-testid="default-thumb-0"]')
  expect(found, 'trigger never received focus while tabbing').toBe(true)

  await page.keyboard.press('Enter')
  await expect(page.locator('dialog[data-image-view]')).toHaveAttribute('data-state', 'open')
})

test('Space on a focused trigger opens the viewer without scrolling', async ({ page }) => {
  await tabTo(page, '[data-testid="default-thumb-0"]')
  const before = await page.evaluate(() => window.scrollY)

  await page.keyboard.press(' ')
  await expect(page.locator('dialog[data-image-view]')).toHaveAttribute('data-state', 'open')
  expect(await page.evaluate(() => window.scrollY)).toBe(before)
})

test('closing returns focus to the trigger it was opened from', async ({ page }) => {
  await tabTo(page, '[data-testid="default-thumb-0"]')
  await page.keyboard.press('Enter')
  await page.waitForSelector('dialog[data-image-view]')

  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[data-image-view]')).toHaveCount(0)

  const restored = await page
    .locator('[data-testid="default-thumb-0"]')
    .evaluate((el) => el === document.activeElement)
  expect(restored, 'focus was not returned to the trigger').toBe(true)
})

test('one Enter opens the viewer once, not twice', async ({ page }) => {
  await tabTo(page, '[data-testid="default-thumb-0"]')
  await page.keyboard.press('Enter')
  await page.waitForSelector('dialog[data-image-view]')

  // A second open would have advanced past the slide that was clicked.
  await expect(page.locator('[data-image-view-title]')).toHaveText(
    'site-survey-north-elevation.jpg',
  )
  await expect(page.locator('dialog[data-image-view]')).toHaveCount(1)
})

test('the page behind the viewer does not scroll', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .toBe('hidden')

  await page.click('[data-image-view-control="close"]')
  await expect(page.locator('dialog[data-image-view]')).toHaveCount(0)

  // And the lock is released rather than left on the page for good.
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden')
})

test('paging is announced through a live region', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  const announcer = page.locator('[data-image-view-announcer]')
  await expect(announcer).toHaveAttribute('aria-live', 'polite')
  await expect(announcer).toContainText('site-survey-north-elevation.jpg')
  await expect(announcer).toContainText('1 / 4')

  await page.keyboard.press('ArrowRight')
  await expect(announcer).toContainText('damage-report-wide.jpg')
  await expect(announcer).toContainText('2 / 4')
})

test('the thumbnail strip does not claim the tab pattern', async ({ page }) => {
  await page.click('[data-testid="gallery-thumb-0"]')
  await page.waitForSelector('[data-image-view-thumbnails]')

  // Tabs owe a tabpanel and roving arrow-key focus; this widget provides
  // neither, and the arrow keys are already bound to paging.
  await expect(page.locator('[data-image-view-thumbnails]')).not.toHaveAttribute('role', 'tablist')
  await expect(page.locator('[data-image-view-thumb][role="tab"]')).toHaveCount(0)
  await expect(page.locator('[data-image-view-thumb][aria-current="true"]')).toHaveCount(1)
})

test('no axe violations with the viewer open', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(
    results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`),
    'axe found accessibility violations',
  ).toEqual([])
})
