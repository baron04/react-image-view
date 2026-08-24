import type { Size } from './types'

export interface LoadedImage {
  element: HTMLImageElement
  natural: Size
}

/**
 * Resolve an image only once it can be painted synchronously.
 *
 * `decode()` is the difference between a slide that appears and one that
 * flashes half-drawn: without it the browser may paint a partially decoded
 * frame on swap.
 */
export async function loadImage(src: string, signal?: AbortSignal): Promise<LoadedImage> {
  const element = new Image()
  element.decoding = 'async'
  element.src = src

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const onAbort = () => {
    element.src = ''
  }
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    // decode() rejects on a broken image in every browser we target, but Safari
    // has historically rejected on some images it can still paint, so fall back
    // to the load event rather than reporting a false failure.
    await element.decode().catch(async () => {
      await new Promise<void>((resolve, reject) => {
        element.onload = () => resolve()
        element.onerror = () => reject(new Error(`Failed to load image: ${src}`))
      })
    })
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }

  return {
    element,
    natural: { width: element.naturalWidth, height: element.naturalHeight },
  }
}

/**
 * Browsers already apply EXIF orientation to `naturalWidth`/`naturalHeight`
 * when `image-orientation: from-image` is in effect, which is the default.
 * Kept as a seam: phone-photographed documents arrive rotated often enough
 * that any browser disagreeing here needs one place to be corrected.
 */
export function respectsExifOrientation(): boolean {
  return true
}
