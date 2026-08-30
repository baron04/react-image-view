import type { Transform } from './core/types'

export interface ImageItem {
  src: string
  alt?: string
  /** Shown by `ImageView.Title`; falls back to `alt`. */
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
 * Almost all of them are `aria-label`s: the default UI renders icon controls,
 * while `errorTitle` is visible beside the retry icon. Hardcoding a language
 * is therefore an accessibility bug rather than only a cosmetic one.
 *
 * Left unset, these use the stable English defaults. Pass `labels` explicitly
 * or import a locale subpath so SSR and hydration render the same language.
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
  retry: string
  /** `aria-label` on the thumbnail strip. */
  thumbnails: string
  /** Builds the `aria-label` for one thumbnail with no name of its own. */
  thumbnailAt(index: number): string
  /** Visible beside the default error state's retry icon. */
  errorTitle: string
  loading: string
}

/**
 * The narrow escape hatch for keyboard behaviour composition cannot reach.
 * Returning `true` marks the event consumed. Visual extensions belong in the
 * component tree; gestures stay owned by Stage's state machine.
 */
export interface Extension {
  name: string
  onKeyDown?(event: KeyboardEvent, api: ViewerApi): boolean | void
}

export interface ImageViewGroupProps {
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
   * Override any user-facing string. Merged over stable English defaults, so
   * passing one field leaves the rest alone. Import a complete locale from a
   * locale subpath when the application should use another language.
   */
  labels?: Partial<ViewerLabels>
  children?: React.ReactNode
}
