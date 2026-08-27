import type { ViewerLabels } from './types'

/**
 * The default UI renders almost no text — the controls are icons, and the one
 * visible string left is the error title. Nearly everything below is an
 * `aria-label`, which is the only label a screen reader user ever gets.
 *
 * That is also why these follow the *browser's* language rather than the
 * application's: a screen reader is configured for the person using it, not
 * for the app it happens to be pointed at. Pass `labels` to override, which is
 * what an app that must stay in one language should do.
 */
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
  downloadOriginal: 'Download the original file',
  retry: 'Try again',
  thumbnails: 'All images',
  thumbnailAt: (index) => `Image ${index + 1}`,
  errorTitle: "This image couldn't be loaded",
  loading: 'Loading',
}

export const zhCN: ViewerLabels = {
  viewer: '图片预览',
  close: '关闭',
  prev: '上一张',
  next: '下一张',
  zoomIn: '放大',
  zoomOut: '缩小',
  rotateLeft: '向左转',
  rotateRight: '向右转',
  fitToWindow: '适应窗口',
  actualSize: '原始尺寸',
  download: '下载',
  downloadOriginal: '下载原文件',
  retry: '重新加载',
  thumbnails: '全部图片',
  thumbnailAt: (index) => `第 ${index + 1} 张`,
  errorTitle: '这张图片加载不出来',
  loading: '加载中',
}

/** @deprecated Use `en`. Kept so existing imports keep working. */
export const defaultLabels = en

const packs: Record<string, ViewerLabels> = { en, zh: zhCN, 'zh-cn': zhCN }

/**
 * Pick a bundled pack for a BCP-47 tag, falling back to English.
 *
 * Only the languages this package actually ships are matched — deliberately
 * two. Shipping a dozen half-maintained locales is worse than shipping none,
 * because a stale translation is indistinguishable from a current one until a
 * user complains. Anything else goes through `labels`.
 */
export function labelsForLocale(tag: string | undefined | null): ViewerLabels {
  if (!tag) return en
  const lower = tag.toLowerCase()
  return packs[lower] ?? packs[lower.split('-')[0] ?? ''] ?? en
}

export function mergeLabels(
  base: ViewerLabels,
  overrides?: Partial<ViewerLabels>,
): ViewerLabels {
  return overrides ? { ...base, ...overrides } : base
}
