import * as React from 'react'
import type { Extension, ImageItem, ViewerApi, ViewerLabels, ViewerStatus } from '../types'
import type { ThumbnailFit } from '../core/flip'
import type { Size, SlideSize, Transform } from '../core/types'
import type { Ticker } from '../core/ticker'

export interface TriggerGeometry {
  rect: DOMRect
  fit: ThumbnailFit
}

export interface TriggerRegistration {
  id: string
  /** Explicit visual position, when mount order is not authoritative. */
  index?: number
  item: ImageItem
  /**
   * Live position and displayed fit mode, read fresh each call — the page may
   * have scrolled or the trigger's own layout may have changed since it was
   * registered, and `fit` has to match reality or the FLIP flight lands
   * somewhere visibly different from the actual thumbnail (see
   * `core/flip.ts`).
   */
  getGeometry(): TriggerGeometry | null
}

/**
 * Machinery the parts share but consumers never see.
 *
 * `transformRef` is the single source of truth during a gesture; the mirrored
 * React state exists only to drive control affordances. Nobody watches whether
 * the zoom button greys out mid-flick, so paying a re-render per frame for it
 * would buy nothing.
 */
export interface ViewerInternals {
  ticker: Ticker
  transformRef: React.MutableRefObject<Transform>
  /** HTML layer that owns translate/scale/rotation for the current image. */
  imageRef: React.MutableRefObject<HTMLDivElement | null>
  /** Whether the current image still owns an opening flight. */
  flip: React.MutableRefObject<boolean>
  trackRef: React.MutableRefObject<HTMLDivElement | null>
  /** Always-current slide index; closures capture stale ones. */
  indexRef: React.MutableRefObject<number>
  stageSize: Size
  setStageSize(size: Size): void
  natural: SlideSize | null
  setNatural(size: SlideSize | null): void
  /** Copy the live transform into React state so controls catch up. */
  syncTransform(): void
  /** Hand transform ownership to the viewer; stops auto-refit on resize. */
  markDirty(): void
  /** Halt every animation and return ownership of the transform. */
  stopAnimations(): void
  setStatus(status: ViewerStatus): void
  /** Bumped to force a fresh <img> element, which is how retry reloads. */
  reloadToken: number
  paint(): void
}

export interface ViewerContextValue {
  api: ViewerApi
  images: ImageItem[]
  container: HTMLElement | null
  internals: ViewerInternals
  extensions: Extension[]
  /** Fully resolved — the caller's overrides already merged over the defaults. */
  labels: ViewerLabels
  registerTrigger(reg: TriggerRegistration): () => void
  indexOf(id: string): number
  /**
   * Live geometry of the thumbnail for a slide, measured on demand — the page
   * may have scrolled since it was opened, and closing has to land where the
   * thumbnail is now, not where it was.
   */
  getTriggerGeometry(index: number): TriggerGeometry | null
  openAt(index: number, from: TriggerGeometry | null): void
}

const ViewerContext = React.createContext<ViewerContextValue | null>(null)

export const ViewerProvider = ViewerContext.Provider

export function useViewerContext(part: string): ViewerContextValue {
  const ctx = React.useContext(ViewerContext)
  if (!ctx) {
    throw new Error(`<ImageView.${part}> must be rendered inside <ImageView.Root>.`)
  }
  return ctx
}

/** Read-only handle plus commands. Safe to call from anywhere inside Root. */
export function useViewer(): ViewerApi {
  return useViewerContext('useViewer').api
}

/**
 * The resolved label set. Use it in custom controls so they localise from the
 * same `labels` prop the built-in ones do, rather than growing a second,
 * unrelated place the host app has to translate.
 */
export function useLabels(): ViewerLabels {
  return useViewerContext('useLabels').labels
}
