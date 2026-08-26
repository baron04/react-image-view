/**
 * Records the demo GIF source.
 *
 * The framing is deliberate: the thumbnail grid is on screen only long enough
 * to show what is being clicked, and the rest of the take is the modal — the
 * open transition, zooming, rotating, panning, paging, and the close flight
 * back to the thumbnail. A reel of the grid would advertise a gallery, which
 * is the one thing this component is not.
 *
 *   node scripts/capture-demo.mjs        # needs the playground on :5180
 *   ffmpeg ... media/demo.webm -> media/demo.gif
 */
import { chromium } from '@playwright/test';
import { mkdirSync, renameSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('media');
const videoDir = path.resolve('.tmp-video');
rmSync(videoDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(videoDir, { recursive: true });

const size = { width: 1000, height: 700 };

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: size,
  recordVideo: { dir: videoDir, size },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto('http://localhost:5180');
await page.waitForSelector('[data-testid="default-thumb-0"]');
// Let every thumbnail decode before recording anything, so the take never
// opens on a half-loaded grid.
await page.waitForFunction(
  () =>
    [...document.querySelectorAll('[data-testid^="default-thumb-"]')].every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  null,
  { timeout: 30_000 },
);
await page.waitForTimeout(700);

// 1. Open from a thumbnail — the interaction the component is named for.
await page.click('[data-testid="default-thumb-0"]');
await page.waitForSelector('dialog[data-image-view]');
await page.waitForTimeout(1100); // the FLIP entry flight

// 2. Zoom in twice, so the toolbar visibly does something.
const zoomIn = page.locator('[data-image-view-control="zoom-in"]');
await zoomIn.click();
await page.waitForTimeout(550);
await zoomIn.click();
await page.waitForTimeout(750);

// 3. Drag the zoomed image — panning is the point of zooming.
const box = await page.locator('[data-image-view-stage]').boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;
await page.mouse.move(cx + 160, cy + 110);
await page.mouse.down();
for (let i = 1; i <= 12; i++) {
  await page.mouse.move(cx + 160 - i * 26, cy + 110 - i * 16);
  await page.waitForTimeout(16);
}
await page.mouse.up();
await page.waitForTimeout(650);

// 4. Back to fit, then 1:1 — the pair of controls this library argues for.
await page.click('[data-image-view-control="fit"]');
await page.waitForTimeout(700);
await page.click('[data-image-view-control="actual-size"]');
await page.waitForTimeout(800);
await page.click('[data-image-view-control="fit"]');
await page.waitForTimeout(650);

// 5. Rotate, because scanned attachments arrive sideways constantly.
await page.click('[data-image-view-control="rotate-right"]');
await page.waitForTimeout(850);

// 6. Page to the next attachment and back.
await page.click('[data-image-view-control="next"]');
await page.waitForTimeout(950);
await page.click('[data-image-view-control="next"]');
await page.waitForTimeout(950);

// 7. Close — the flight back to the thumbnail is worth showing.
await page.click('[data-image-view-control="close"]');
await page.waitForTimeout(1100);

await context.close();
await browser.close();

const file = readdirSync(videoDir).find((f) => f.endsWith('.webm'));
const dest = path.join(outDir, 'demo.webm');
renameSync(path.join(videoDir, file), dest);
rmSync(videoDir, { recursive: true, force: true });
console.log('saved', dest);
