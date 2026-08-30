/**
 * Records the demo GIF source.
 *
 * The framing is deliberate: the thumbnail grid is on screen only long enough
 * to show what is being clicked, and the rest of the take is the modal — the
 * open transition, zooming, rotating, panning, paging, and the close flight
 * back to the thumbnail. A reel of the grid would advertise a gallery, which
 * is the one thing this component is not.
 *
 * Records and encodes in one step — the trim offset below only means anything
 * relative to this recording, so splitting them invites the two drifting apart.
 *
 *   pnpm vite                            # the playground, on :5180
 *   node scripts/capture-demo.mjs        # -> media/demo.gif
 */
import { chromium } from '@playwright/test'
import { mkdirSync, renameSync, readdirSync, rmSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const outDir = path.resolve('media')
const videoDir = path.resolve('.tmp-video')
rmSync(videoDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
mkdirSync(videoDir, { recursive: true })

const size = { width: 1000, height: 700 }

const browser = await chromium.launch()

// Playwright starts recording when the *context* is created, not when the page
// is ready — so navigation, the network fetch for every photograph, and decode
// are all in the take. That is why the first seconds were a blank page and a
// grid of grey placeholders. Timing from here lets the encoder trim them.
const recordingStart = Date.now()

const context = await browser.newContext({
  viewport: size,
  recordVideo: { dir: videoDir, size },
  deviceScaleFactor: 2,
})
const page = await context.newPage()

await page.goto('http://localhost:5180')
await page.waitForSelector('[data-testid="default-thumb-0"]')

// Every image on the page, not just the grid being clicked: the viewport shows
// the second demo's thumbnails too, and a half-loaded one further down is just
// as visible in the recording.
await page.waitForFunction(
  () => {
    const imgs = [...document.querySelectorAll('img')]
    return imgs.length > 0 && imgs.every((img) => img.complete && img.naturalWidth > 0)
  },
  null,
  { timeout: 60_000 },
)

// Decoded is not the same as painted; give the compositor a moment so the
// first kept frame is the finished grid rather than the frame it appears on.
// This wait is *before* the mark, so it is trimmed away.
await page.waitForTimeout(400)
const trimSeconds = (Date.now() - recordingStart) / 1000

// Everything from here is kept. The grid gets a beat on screen — long enough
// to show which thumbnail is about to be clicked, which is the whole point of
// opening from one — and no longer, because a reel of the grid would advertise
// the gallery this deliberately is not.
await page.waitForTimeout(450)

// 1. Open from a thumbnail — the interaction the component is named for.
await page.click('[data-testid="default-thumb-0"]')
await page.waitForSelector('dialog[data-image-view]')
await page.waitForTimeout(1100) // the FLIP entry flight

// 2. Zoom in twice, so the toolbar visibly does something.
const zoomIn = page.locator('[data-image-view-control="zoom-in"]')
await zoomIn.click()
await page.waitForTimeout(550)
await zoomIn.click()
await page.waitForTimeout(750)

// 3. Drag the zoomed image — panning is the point of zooming.
const box = await page.locator('[data-image-view-stage]').boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + box.height / 2
await page.mouse.move(cx + 160, cy + 110)
await page.mouse.down()
for (let i = 1; i <= 12; i++) {
  await page.mouse.move(cx + 160 - i * 26, cy + 110 - i * 16)
  await page.waitForTimeout(16)
}
await page.mouse.up()
await page.waitForTimeout(650)

// 4. Back to fit, then 1:1 — the pair of controls this library argues for.
await page.click('[data-image-view-control="fit"]')
await page.waitForTimeout(700)
await page.click('[data-image-view-control="actual-size"]')
await page.waitForTimeout(800)
await page.click('[data-image-view-control="fit"]')
await page.waitForTimeout(650)

// 5. Rotate the current image.
await page.click('[data-image-view-control="rotate-right"]')
await page.waitForTimeout(850)

// 6. Page to the next image and back.
await page.click('[data-image-view-control="next"]')
await page.waitForTimeout(950)
await page.click('[data-image-view-control="next"]')
await page.waitForTimeout(950)

// 7. Close — the flight back to the thumbnail is worth showing.
await page.click('[data-image-view-control="close"]')
await page.waitForTimeout(1100)

await context.close()
await browser.close()

const file = readdirSync(videoDir).find((f) => f.endsWith('.webm'))
const source = path.join(outDir, 'demo.webm')
renameSync(path.join(videoDir, file), source)
rmSync(videoDir, { recursive: true, force: true })

const gif = path.join(outDir, 'demo.gif')

/**
 * Encoded here rather than by a separate command, so the trim offset can never
 * drift from the recording it belongs to.
 *
 * The filter chain, in order:
 *
 *   -ss           drop the load-in: navigation, image fetches, decode.
 *   fps=10        resample first, so everything downstream works at the rate
 *                 that will actually be written.
 *   tpad          hold the opening frame. A GIF loops, so without it the take
 *                 restarts mid-motion with no moment to register what is being
 *                 looked at. Before mpdecimate on purpose — the padding is
 *                 exact copies, which mpdecimate folds into one long-delay
 *                 frame, so the hold costs a frame rather than a second's.
 *   mpdecimate    drop frames near-identical to the one before. The viewer
 *                 spends most of the take holding an image steady, and GIF
 *                 stores a delay per frame, so a dropped run becomes a longer
 *                 delay instead of a dozen copies. Halved the frame count.
 *   fps_mode=vfr  required for that: otherwise ffmpeg re-duplicates the
 *                 dropped frames to keep a constant rate and mpdecimate buys
 *                 nothing. Note there is deliberately no `setpts` — the usual
 *                 mpdecimate recipe re-times the survivors to a constant rate,
 *                 which is for speeding a clip up and would undo exactly this.
 *   palette       48 colours at 560px, measured on this take:
 *                   64c 620w   3817 kB   best quality
 *                   48c 560w   2529 kB   chosen
 *                   32c 520w   1913 kB   visible banding on skin and hair
 *                 Photographs are the expensive part, since a 256-colour
 *                 format has to posterise them — the palette is where the
 *                 bytes are, not the frame count.
 */
const filters =
  `fps=10,tpad=start_duration=1.5:start_mode=clone,` +
  `mpdecimate=hi=64*12:lo=64*5:frac=0.1,` +
  `scale=560:-1:flags=lanczos,split[s0][s1];` +
  `[s0]palettegen=max_colors=48:stats_mode=diff[p];` +
  `[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`

execFileSync(
  'ffmpeg',
  ['-y', '-ss', trimSeconds.toFixed(2), '-i', source, '-vf', filters, '-fps_mode', 'vfr', gif],
  { stdio: ['ignore', 'ignore', 'pipe'] },
)

const kb = (p) => Math.round(statSync(p).size / 1024)
console.log(`trimmed ${trimSeconds.toFixed(2)}s of load-in`)
console.log(`saved ${gif} (${kb(gif)} kB, from ${kb(source)} kB of video)`)
