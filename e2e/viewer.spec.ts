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
    const media = document.querySelector('[data-image-view-slide][data-current] > div')
    return media ? getComputedStyle(media).transform : null
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?offline=1')
})

test('L2: opens on the clicked thumbnail, shows its title', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await expect(page.locator('dialog[data-image-view]')).toHaveAttribute('data-state', 'open')
  await expect(page.locator('[data-image-view-title]')).toHaveText(
    'site-survey-north-elevation.jpg',
  )
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

test('wheel zoom and fit share one transform layer', async ({ page }) => {
  await page.click('[data-testid="default-thumb-3"]')
  const stage = page.locator('[data-image-view-stage]')
  const box = await stage.boundingBox()
  expect(box).not.toBeNull()

  const before = await currentTransform(page)
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.wheel(0, -120)
  await expect.poll(() => currentTransform(page)).not.toBe(before)

  const image = page.locator('[data-image-view-slide][data-current] img')
  await expect(image).toHaveCSS('transform', 'none')

  await page.click('[data-image-view-control="fit"]')
  await expect(page.locator('[data-image-view-control="fit"]')).toHaveAttribute('data-active', '')

  const fitted = await image.boundingBox()
  const fittedStage = await stage.boundingBox()
  expect(fitted).not.toBeNull()
  expect(fittedStage).not.toBeNull()
  expect(fitted!.width).toBeLessThanOrEqual(fittedStage!.width + 1)
  expect(fitted!.height).toBeLessThanOrEqual(fittedStage!.height + 1)
})

test('reopening uses the new Stage size rather than closing geometry', async ({ page }) => {
  for (let open = 0; open < 2; open++) {
    await page.click('[data-testid="default-thumb-3"]')
    await expect(page.locator('[data-image-view-control="fit"]')).toHaveAttribute('data-active', '')

    const stage = await page.locator('[data-image-view-stage]').boundingBox()
    const image = await page.locator('[data-image-view-slide][data-current] img').boundingBox()
    expect(stage).not.toBeNull()
    expect(image).not.toBeNull()
    expect(image!.width).toBeLessThanOrEqual(stage!.width + 1)
    expect(image!.height).toBeLessThanOrEqual(stage!.height + 1)

    await page.click('[data-image-view-control="close"]')
    await expect(page.locator('dialog[data-image-view]')).toHaveCount(0)
  }
})

test('next/prev page through the set and update the title', async ({ page }) => {
  await page.click('[data-testid="default-thumb-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  await page.click('[data-image-view-control="next"]')
  await expect(page.locator('[data-image-view-title]')).toHaveText('damage-report-wide.jpg')

  await page.click('[data-image-view-control="prev"]')
  await expect(page.locator('[data-image-view-title]')).toHaveText(
    'site-survey-north-elevation.jpg',
  )
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

  await expect(page.locator('dialog[data-image-view]')).toHaveAttribute(
    'aria-label',
    'Image viewer',
  )
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

  const live = page.locator('[data-image-view-slide][data-current] > div')
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
      const cropStyle = getComputedStyle(el.firstElementChild!)
      const m = new DOMMatrixReadOnly(style.transform)
      const scaleX = Math.hypot(m.a, m.b) || 1
      const scaleY = Math.hypot(m.c, m.d) || 1
      // `inset()` takes the margin shorthand, and the browser serialises it in
      // its shortest form — `inset(425px 0px)` here, meaning top/bottom then
      // left/right. Reading that as four values silently drops `bottom`, which
      // is exactly half the crop and made this test fail against correct code.
      const match = /inset\(([^)]+)\)/.exec(cropStyle.clipPath)
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
        x: r.x + left * scaleX,
        y: r.y + top * scaleY,
        width: r.width - (left + right) * scaleX,
        height: r.height - (top + bottom) * scaleY,
      }
    }

    return new Promise<{ x: number; y: number; width: number; height: number }>((resolve) => {
      let last = { x: 0, y: 0, width: 0, height: 0 }
      const tick = () => {
        if (!el.isConnected) return resolve(last)
        const box = visible()
        if (box.width > 0) last = box
        requestAnimationFrame(tick)
      }
      tick()
    })
  })

  // Within a couple of pixels of the thumbnail's own image box, on every
  // axis. Size alone is not enough: a flight can be the right size and still
  // settle in the wrong place, which reads as the same jump to a viewer.
  expect(Math.abs(landing.x - before!.x)).toBeLessThan(3)
  expect(Math.abs(landing.y - before!.y)).toBeLessThan(3)
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
  // Warm the full-size image first. Chromium may set `complete` only after
  // the mount layout effect even for a memory-cache hit; reopening must still
  // preserve the shared-element flight when load wins before the first paint.
  await page.getByTestId('default-thumb-0').click()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.locator('dialog[data-image-view]')).toHaveCount(0)

  const samples = await page.evaluate(async () => {
    const computed = new Set<string>()
    const inline = new Set<string>()
    const durations = new Set<string>()
    const sample = () => {
      const media = document.querySelector('[data-image-view-slide][data-current] > div')
      if (!media) return
      const style = getComputedStyle(media)
      const m = new DOMMatrixReadOnly(style.transform)
      computed.add(Math.hypot(m.a, m.b).toFixed(4))
      inline.add((media as HTMLElement).style.transform)
      durations.add(style.transitionDuration)
    }
    const started = performance.now()
    ;(document.querySelector('[data-testid="default-thumb-0"]') as HTMLElement).click()
    return new Promise<{ computed: number; inline: number; durations: string[] }>((resolve) => {
      const tick = () => {
        sample()
        if (performance.now() - started < 900) requestAnimationFrame(tick)
        else resolve({ computed: computed.size, inline: inline.size, durations: [...durations] })
      }
      requestAnimationFrame(tick)
    })
  })

  // A real flight passes through many computed scales, but its inline style
  // only receives the two endpoints. Writing every intermediate value from
  // rAF makes Chromium repeatedly rasterise a growing large-image layer and
  // can expose missing tiles for a frame.
  expect(samples.computed).toBeGreaterThan(8)
  expect(samples.inline).toBeLessThanOrEqual(3)
  expect(samples.durations).toContain('0.36s')
})

test('the close animation settles smoothly, with no jump on the last frame', async ({ page }) => {
  // The landing position was already exact — what was wrong was everything
  // leading up to it. `[data-closing]` hides the header and toolbar, which
  // reflows the dialog's column, and the flight was measured before that
  // reflow: the whole animation ran ~24px above where it belonged and only
  // agreed with the thumbnail on the final frame, when removing the attribute
  // restored the layout the numbers had assumed. Asserting the endpoint alone
  // passes against that; the tail is what shows it.
  const thumb = page.locator('[data-testid="card-img-0"]')
  const before = await thumb.boundingBox()

  await page.click('[data-testid="card-0"]')
  await page.waitForSelector('dialog[data-image-view]')

  const result = await page
    .locator('[data-image-view-slide][data-current] > div')
    .evaluate((el) => {
      const visibleTop = () => {
        const r = el.getBoundingClientRect()
        const s = getComputedStyle(el)
        const m = new DOMMatrixReadOnly(s.transform)
        const scaleY = Math.hypot(m.c, m.d) || 1
        const crop = getComputedStyle(el.firstElementChild!)
        const match = /inset\(([^)]+)\)/.exec(crop.clipPath)
        const v = match ? match[1].split(/\s+/).map((n) => parseFloat(n) || 0) : [0]
        const top = v[0]
        return r.y + top * scaleY
      }

      const seen: number[] = []
      const durations = new Set<string>()
      ;(document.querySelector('[data-image-view-control="close"]') as HTMLElement).click()
      return new Promise<{ seen: number[]; durations: string[] }>((resolve) => {
        const tick = () => {
          if (!el.isConnected) return resolve({ seen, durations: [...durations] })
          seen.push(visibleTop())
          durations.add(getComputedStyle(el).transitionDuration)
          requestAnimationFrame(tick)
        }
        tick()
      })
    })

  // The last handful of frames must already be sitting on the thumbnail, not
  // arriving there in one step. The regression this guards against was
  // ~24px for the whole flight (see the commit that added this test); a
  // shared CI runner samples rAF coarsely enough that the tail can land a
  // few px short of the resting spot without the flight actually being
  // broken, so the tolerance has headroom below that 24px class of bug
  // without chasing single-digit CI jitter.
  expect(result.durations).toContain('0.18s')
  const last = result.seen.slice(-5)
  expect(last.length).toBeGreaterThan(2)
  for (const y of last) {
    expect(Math.abs(y - before!.y)).toBeLessThan(8)
  }
})
