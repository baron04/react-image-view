import * as React from 'react'
import type { ImageItem, ViewerApi } from '../types'

export interface TriggerRegistration {
  id: string
  item: ImageItem
  getRect(): DOMRect | null
}

export interface ViewerContextValue {
  api: ViewerApi
  images: ImageItem[]
  container: HTMLElement | null
  registerTrigger(reg: TriggerRegistration): () => void
  /** Index a trigger occupies, resolved at click time from registration order. */
  indexOf(id: string): number
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
