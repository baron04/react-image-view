import * as React from 'react'
import type { Extension, ImageItem, ViewerApi, ViewerStatus } from '../types'
import type { Size, SlideSize, Transform } from '../core/types'
import type { Ticker } from '../core/ticker'

export interface TriggerRegistration {
  id: string
  item: ImageItem
  getRect(): DOMRect | null
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
  imageRef: React.MutableRefObject<HTMLImageElement | null>
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
  registerTrigger(reg: TriggerRegistration): () => void
  indexOf(id: string): number
  /**
   * Live position of the thumbnail for a slide, measured on demand — the page
   * may have scrolled since it was opened, and closing has to land where the
   * thumbnail is now, not where it was.
   */
  getTriggerRect(index: number): DOMRect | null
  openAt(index: number, from: DOMRect | null): void
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
