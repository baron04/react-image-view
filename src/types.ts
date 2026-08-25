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
 * These are English by default and overridable as a whole or field by field,
 * because a component that hardcodes one language is unusable in an app
 * written in another — and most of these are `aria-label`s, so getting them
 * wrong is an accessibility bug, not a cosmetic one: a screen reader
 * announces them verbatim regardless of the page's `lang`.
 *
 * Passed to `Root` as `labels`; read anywhere below it with `useLabels()`.
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
  retry: string
  /** `aria-label` on the thumbnail strip. */
  thumbnails: string
  /** Builds the `aria-label` for one thumbnail with no name of its own. */
  thumbnailAt(index: number): string
  /** Shown by the default error state. */
  errorTitle: string
  errorHint: string
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
