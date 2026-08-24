import { Root } from './react/parts/Root'
import { Trigger } from './react/parts/Trigger'
import { Content } from './react/parts/Content'
import { Stage } from './react/parts/Stage'
import { Image } from './react/parts/Image'
import {
  ActualSize, Close, Download, FitToWindow, Next, Prev,
  RotateLeft, RotateRight, ZoomIn, ZoomOut,
} from './react/parts/controls'
import {
  Counter, ErrorState, Footer, Header, Loading, Title, Toolbar,
} from './react/parts/containers'

/**
 * Every part, namespaced. Assembling these is what the presets do, and what
 * the copy-paste source in the registry shows — there is no second, private
 * API underneath.
 */
export const ImageView = {
  Root, Trigger, Content, Stage, Image,
  Header, Toolbar, Footer, Title, Counter, Loading, Error: ErrorState,
  Close, Prev, Next, ZoomIn, ZoomOut, RotateLeft, RotateRight,
  FitToWindow, ActualSize, Download,
}

export {
  Root, Trigger, Content, Stage, Image,
  Header, Toolbar, Footer, Title, Counter, Loading, ErrorState,
  Close, Prev, Next, ZoomIn, ZoomOut, RotateLeft, RotateRight,
  FitToWindow, ActualSize, Download,
}

export { useViewer } from './react/context'
export { Slot, composeRefs } from './react/slot'
export type {
  ImageItem, ViewerApi, ViewerStatus, Extension, ImageViewRootProps, GestureHookPhase,
} from './types'
export type { ControlProps, DownloadProps } from './react/parts/controls'
export type { CounterProps, ErrorProps, RegionProps, StatusProps, TitleProps } from './react/parts/containers'
export type { Size, Point, Transform, Bounds } from './core/types'
export * as core from './core'
