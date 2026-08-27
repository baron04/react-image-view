import type { Transform } from './core/types'

export interface ImageItem {
  src: string
  alt?: string
  /** Shown by `ImageView.Title`; falls back to `alt`, then to the filename. */
  name?: string
  /** Skips a measurement round-trip and stops the layout jumping on load. */
  width?: number
  height?: number
  /** Defaults to `src`. Set when the download should serve a different file. */
  downloadUrl?: string
}

export type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface ViewerApi {
  readonly index: number
  readonly total: number
  readonly open: boolean
  readonly transform: Transform
  readonly scale: number
  readonly rotation: number
  readonly fitScale: number
  readonly canZoomIn: boolean
  readonly canZoomOut: boolean
  readonly canPrev: boolean
  readonly canNext: boolean
  readonly status: ViewerStatus

  /**
   * `immediate` skips the settling animation. Continuous input — a wheel, a
   * trackpad pinch — must track the hand one to one; starting a spring per
   * event makes each one cancel the last, and the zoom crawls.
   */
  zoomTo(scale: number, options?: { origin?: { x: number; y: number }; immediate?: boolean }): void
  zoomBy(factor: number): void
  fit(): void
  actualSize(): void
  rotate(degrees: number): void
  go(index: number): void
  next(): void
  prev(): void
  close(): void
  retry(): void
}

/**
 * Every user-facing string the library can render, in one place.
 *
 * Almost all of them are `aria-label`s: the default UI renders icons, and the
 * only visible string left is `errorTitle`. That makes hardcoding a language
 * an accessibility bug rather than a cosmetic one — a screen reader announces
 * these verbatim whatever the page's `lang` says.
 *
 * Left unset, these follow the browser's language among the packs this
 * package ships (English and Simplified Chinese) — see src/labels.ts for why
 * the browser rather than the application. Pass `labels` to pin them.
 *
 * Read anywhere below `Root` with `useLabels()`.
 */
export interface ViewerLabels {
  /** `aria-label` on the modal itself. */
  viewer: string
  close: string
  prev: string
  next: string
  zoomIn: string
  zoomOut: string
  rotateLeft: string
  rotateRight: string
  fitToWindow: string
  actualSize: string
  download: string
  /** The error state's download action, which is about the original file. */
  downloadOriginal: string
  retry: string
  /** `aria-label` on the thumbnail strip. */
  thumbnails: string
  /** Builds the `aria-label` for one thumbnail with no name of its own. */
  thumbnailAt(index: number): string
  /** The one string the default UI still renders as visible text. */
  errorTitle: string
  loading: string
}

export type GestureHookPhase = 'start' | 'move' | 'end'

/**
 * The escape hatch for behaviour that composition cannot reach — intercepting
 * a gesture, claiming a key. Returning `true` marks the event consumed.
 *
 * Deliberately two hooks and no lifecycle: anything that needs to *render*
 * belongs in the tree as a child, not here. Widen this and it grows into the
 * plugin system this library exists to avoid.
 */
export interface Extension {
  name: string
  onKeyDown?(event: KeyboardEvent, api: ViewerApi): boolean | void
  onGesture?(phase: GestureHookPhase, api: ViewerApi): boolean | void
}

export interface ImageViewRootProps {
  images?: ImageItem[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?(open: boolean): void
  index?: number
  defaultIndex?: number
  onIndexChange?(index: number): void
  /**
   * Portal target. Defaults to `document.body`, which isolates the viewer from
   * inherited fonts and stray descendant selectors in the host page — the usual
   * hazard in an admin shell. Point it at a themed container when the app scopes
   * its dark class to something other than the document root, or the portal will
   * escape the theme along with the styling it was meant to escape.
   */
  container?: HTMLElement | null
  extensions?: Extension[]
  /**
   * Override any user-facing string. Merged over the English defaults, so
   * passing one field leaves the rest alone.
   */
  labels?: Partial<ViewerLabels>
  children?: React.ReactNode
}
