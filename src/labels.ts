import type { ViewerLabels } from './types'

/** Stable defaults for SSR, hydration and applications that do not localise. */
export const en: ViewerLabels = {
  viewer: 'Image viewer',
  close: 'Close',
  prev: 'Previous image',
  next: 'Next image',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  rotateLeft: 'Rotate left',
  rotateRight: 'Rotate right',
  fitToWindow: 'Fit to window',
  actualSize: 'Actual size',
  download: 'Download',
  retry: 'Try again',
  thumbnails: 'All images',
  thumbnailAt: (index) => `Image ${index + 1}`,
  errorTitle: "This image couldn't be loaded",
  loading: 'Loading',
}

/** @deprecated Use `en`. Kept so existing imports keep working. */
export const defaultLabels = en

export function mergeLabels(base: ViewerLabels, overrides?: Partial<ViewerLabels>): ViewerLabels {
  return overrides ? { ...base, ...overrides } : base
}
