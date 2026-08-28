import * as React from 'react'
import type { ImageItem, ImageViewRootProps } from '../types'
import { Root } from '../react/parts/Root'
import { DefaultContent, type DefaultContentProps } from './DefaultContent'

export interface ImagePreviewOpenOptions {
  images: ImageItem[]
  index?: number
}

export interface ImagePreviewController {
  /** Open a set of images. Calling this again replaces the current set. */
  open(options: ImagePreviewOpenOptions): void
  close(): void
  go(index: number): void
  next(): void
  prev(): void
}

export interface ImagePreviewProviderProps
  extends Pick<ImageViewRootProps, 'container' | 'extensions' | 'labels'>, DefaultContentProps {
  children?: React.ReactNode
  /** Replace the preset UI with a composition built from ImageView parts. */
  content?: React.ReactNode
}

interface PreviewState {
  images: ImageItem[]
  index: number
  open: boolean
}

type PreviewAction =
  | { type: 'open'; options: ImagePreviewOpenOptions }
  | { type: 'set-open'; open: boolean }
  | { type: 'go'; index: number }
  | { type: 'step'; delta: -1 | 1 }

const INITIAL_STATE: PreviewState = { images: [], index: 0, open: false }

function validIndex(index: number | undefined, total: number): number {
  if (!total) return 0
  const integer = Number.isFinite(index) ? Math.trunc(index ?? 0) : 0
  return Math.min(Math.max(integer, 0), total - 1)
}

function reducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'open': {
      const { images } = action.options
      return {
        images,
        index: validIndex(action.options.index, images.length),
        open: images.length > 0,
      }
    }
    case 'set-open':
      return action.open === state.open ? state : { ...state, open: action.open }
    case 'go': {
      const index = validIndex(action.index, state.images.length)
      return index === state.index ? state : { ...state, index }
    }
    case 'step': {
      const index = validIndex(state.index + action.delta, state.images.length)
      return index === state.index ? state : { ...state, index }
    }
  }
}

const ImagePreviewContext = React.createContext<ImagePreviewController | null>(null)

/**
 * Mount one managed viewer near the application root, then open it from any
 * descendant with `useImagePreview()`. It uses the normal Root internally, so
 * keyboard, gestures, focus management and a custom composed `content` keep
 * the same behaviour as the declarative API.
 */
export function ImagePreviewProvider({
  children,
  content,
  counter = false,
  thumbnails = false,
  container,
  extensions,
  labels,
}: ImagePreviewProviderProps) {
  const [state, dispatch] = React.useReducer(reducer, INITIAL_STATE)

  const controller = React.useMemo<ImagePreviewController>(
    () => ({
      open: (options) => dispatch({ type: 'open', options }),
      close: () => dispatch({ type: 'set-open', open: false }),
      go: (index) => dispatch({ type: 'go', index }),
      next: () => dispatch({ type: 'step', delta: 1 }),
      prev: () => dispatch({ type: 'step', delta: -1 }),
    }),
    [],
  )

  return (
    <ImagePreviewContext.Provider value={controller}>
      {children}
      <Root
        images={state.images}
        open={state.open}
        index={state.index}
        onOpenChange={(open) => dispatch({ type: 'set-open', open })}
        onIndexChange={(index) => dispatch({ type: 'go', index })}
        container={container}
        extensions={extensions}
        labels={labels}
      >
        {content ?? <DefaultContent counter={counter} thumbnails={thumbnails} />}
      </Root>
    </ImagePreviewContext.Provider>
  )
}

/** Open and control the nearest `ImagePreviewProvider`. */
export function useImagePreview(): ImagePreviewController {
  const controller = React.useContext(ImagePreviewContext)
  if (!controller) {
    throw new Error('useImagePreview() must be rendered inside <ImagePreviewProvider>.')
  }
  return controller
}
