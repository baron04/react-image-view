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
  await page.goto('/?offline=1')
})

test('L2: opens on the clicked thumbnail, shows its title', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await expect(page.locator('dialog[data-image-view]')).toHaveAttribute('data-state', 'open')
  await expect(page.locator('[data-image-view-title]')).toHaveText('site-survey-north-elevation.jpg')
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
  await expect(page.locator('[data-image-view-title]')).toHaveText('damage-report-wide.jpg')

  await page.click('[data-image-view-control="prev"]')
  await expect(page.locator('[data-image-view-title]')).toHaveText('site-survey-north-elevation.jpg')
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
  await expect(page.locator('[data-image-view-title]')).toHaveText('damage-report-wide.jpg')

  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[data-image-view]')).toHaveCount(0)
})

test('ships English labels by default, on visible text and aria-labels alike', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  await expect(page.locator('dialog[data-image-view]')).toHaveAttribute('aria-label', 'Image viewer')
  await expect(page.locator('[data-image-view-control="zoom-in"]')).toHaveAttribute(
    'aria-label',
    'Zoom in',
  )

  // The whole modal, not just the labels: a stray CJK character anywhere in
  // the default UI means another hardcoded string slipped back in.
  const text = await page.locator('dialog[data-image-view]').innerText()
  expect(text).not.toMatch(/[一-鿿]/)
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

test('closing lands on the picture, not on the wrapper around it', async ({ page }) => {
  // The trigger here is a <figure> holding the image *and* a caption, which is
  // what real consumers write and what the other demos do not exercise. The
  // FLIP flight used to measure the trigger, so it flew to a box taller than
  // the thumbnail by the height of the caption and the close ended on a jump.
  const thumb = page.locator('[data-testid="card-img-0"]')
  const before = await thumb.boundingBox()
  expect(before).not.toBeNull()

  await page.click('[data-testid="card-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  const live = page.locator('[data-image-view-slide][data-current] img')
  await page.click('[data-image-view-control="close"]')

  // Sample the flight's last frame, just before the dialog unmounts.
  //
  // A `cover` thumbnail is reproduced by scaling the image to fill the box and
  // clipping the overflow, so the element's own rect is legitimately taller
  // than what is on screen. Comparing raw rects would fail on a correct
  // implementation; the visible box is the rect minus the clip, and the clip
  // is in the element's local pixels, hence the scale from the matrix.
  const landing = await live.evaluate((el) => {
    const visible = () => {
      const r = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      const m = new DOMMatrixReadOnly(style.transform)
      const scaleX = Math.hypot(m.a, m.b) || 1
      const scaleY = Math.hypot(m.c, m.d) || 1
      // `inset()` takes the margin shorthand, and the browser serialises it in
      // its shortest form — `inset(425px 0px)` here, meaning top/bottom then
      // left/right. Reading that as four values silently drops `bottom`, which
      // is exactly half the crop and made this test fail against correct code.
      const match = /inset\(([^)]+)\)/.exec(style.clipPath)
      const v = match ? match[1].split(/\s+/).map((n) => parseFloat(n) || 0) : [0]
      const [top, right, bottom, left] =
        v.length === 1
          ? [v[0], v[0], v[0], v[0]]
          : v.length === 2
            ? [v[0], v[1], v[0], v[1]]
            : v.length === 3
              ? [v[0], v[1], v[2], v[1]]
              : [v[0], v[1], v[2], v[3]]
      return {
        width: r.width - (left + right) * scaleX,
        height: r.height - (top + bottom) * scaleY,
      }
    }

    return new Promise<{ width: number; height: number }>((resolve) => {
      let last = { width: 0, height: 0 }
      const tick = () => {
        if (!el.isConnected) return resolve(last)
        const box = visible()
        if (box.width > 0) last = box
        requestAnimationFrame(tick)
      }
      tick()
    })
  })

  // Within a couple of pixels of the thumbnail's own image box. Measured
  // against the wrapper it overshot by the caption's height — ~33% taller.
  expect(Math.abs(landing.width - before!.width)).toBeLessThan(3)
  expect(Math.abs(landing.height - before!.height)).toBeLessThan(3)
})

test('opening animates from the thumbnail rather than appearing', async ({ page }) => {
  // The entry flight was started and then erased inside the same commit: the
  // refit effect treats `framedFor !== index` as a slide change, a slide
  // change overrides every guard including `animating`, and on the first open
  // that comparison is `null !== 0`. So it cancelled the flight and snapped to
  // the fitted scale before a frame was painted — opening looked instant while
  // closing animated normally, which is a hard difference to notice by eye.
  const scales = await page.evaluate(async () => {
    const seen = new Set<string>()
    const sample = () => {
      const img = document.querySelector('[data-image-view-slide][data-current] img')
      if (!img) return
      const m = new DOMMatrixReadOnly(getComputedStyle(img).transform)
      seen.add(Math.hypot(m.a, m.b).toFixed(4))
    }
    const started = performance.now()
    ;(document.querySelector('[data-testid="default-thumb-0"]') as HTMLElement).click()
    return new Promise<number>((resolve) => {
      const tick = () => {
        sample()
        if (performance.now() - started < 900) requestAnimationFrame(tick)
        else resolve(seen.size)
      }
      requestAnimationFrame(tick)
    })
  })

  // A real spring passes through dozens of intermediate scales; a cancelled
  // one reports exactly 1, the destination.
  expect(scales).toBeGreaterThan(8)
})
