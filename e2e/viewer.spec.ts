import { test, expect } from '@playwright/test'

/**
 * Real pointer events throughout — Playwright's `.click()` drives an actual
 * mousedown/mouseup/click sequence, not the DOM `.click()` method. That
 * distinction matters here: a bug where Stage's pointer capture swallowed
 * clicks on the toolbar shipped in 0.1.0 and went unnoticed because manual
 * testing leaned on keyboard shortcuts, which never touch Stage's pointer
 * handling at all. Any interaction test in this file that used a synthetic
 * `.click()` instead of a real one would have missed it too.
 */

function currentTransform(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const img = document.querySelector('[data-image-view-slide][data-current] img')
    return img ? getComputedStyle(img).transform : null
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('L2: opens on the clicked thumbnail, shows its title', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await expect(page.locator('dialog[data-image-view]')).toHaveAttribute('data-state', 'open')
  await expect(page.locator('[data-image-view-title]')).toHaveText('采购合同_扫描件_第1页.jpg')
})

test('toolbar buttons respond to a real pointer click', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  const before = await currentTransform(page)
  await page.click('[data-image-view-control="zoom-in"]')
  await expect.poll(() => currentTransform(page)).not.toBe(before)
})

test('rotate changes the image transform', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  const before = await currentTransform(page)
  await page.click('[data-image-view-control="rotate-right"]')
  await expect.poll(() => currentTransform(page)).not.toBe(before)
})

test('next/prev page through the set and update the title', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  await page.click('[data-image-view-control="next"]')
  await expect(page.locator('[data-image-view-title]')).toHaveText('发票_2026Q3.jpg')

  await page.click('[data-image-view-control="prev"]')
  await expect(page.locator('[data-image-view-title]')).toHaveText('采购合同_扫描件_第1页.jpg')
})

test('close unmounts the dialog', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  await page.click('[data-image-view-control="close"]')
  await expect(page.locator('dialog[data-image-view]')).toHaveCount(0)
})

test('keyboard: arrow keys page, Escape closes', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-image-view-title]')).toHaveText('发票_2026Q3.jpg')

  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[data-image-view]')).toHaveCount(0)
})

test('L1: single-image entry point opens and closes', async ({ page }) => {
  await page.click('[data-testid="solo-thumb"]')
  await expect(page.locator('dialog[data-image-view]')).toHaveAttribute('data-state', 'open')

  await page.click('[data-image-view-control="close"]')
  await expect(page.locator('dialog[data-image-view]')).toHaveCount(0)
})

test('L3: fully composed content still opens and shows custom controls', async ({ page }) => {
  await page.click('[data-testid="thumb-0"]')
  await expect(page.locator('[data-testid="close"]')).toBeVisible()
  await expect(page.locator('[data-testid="download"]')).toBeVisible()

  await page.click('[data-testid="next"]')
  await expect(page.locator('[data-testid="idx"]')).toHaveText('2 / 4')
})
