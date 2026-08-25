import type { ViewerLabels } from './types'

/**
 * English is the default because the package is published and documented in
 * English; anything else is a `labels` override away. Shipping a different
 * language as the default would silently put untranslatable text into every
 * app that installs this without reading the docs first.
 */
export const defaultLabels: ViewerLabels = {
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
  retry: 'Retry',
  thumbnails: 'All images',
  thumbnailAt: (index) => `Image ${index + 1}`,
  errorTitle: "This image couldn't be loaded",
  errorHint:
    'The file may be damaged, or in a format this browser cannot decode. The original can still be downloaded and opened locally.',
  loading: 'Loading…',
}

export function mergeLabels(overrides?: Partial<ViewerLabels>): ViewerLabels {
  return overrides ? { ...defaultLabels, ...overrides } : defaultLabels
}
