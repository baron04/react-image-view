import { Root } from './react/parts/Root'
import { Trigger } from './react/parts/Trigger'
import { Content } from './react/parts/Content'
import { Stage } from './react/parts/Stage'
import { Image } from './react/parts/Image'
import {
  ActualSize,
  Close,
  Download,
  FitToWindow,
  Next,
  Prev,
  RotateLeft,
  RotateRight,
  ZoomIn,
  ZoomOut,
} from './react/parts/controls'
import {
  Counter,
  ErrorState,
  Footer,
  Header,
  Loading,
  Title,
  Toolbar,
} from './react/parts/containers'
import { Thumbnails } from './react/parts/Thumbnails'

/**
 * Headless entry: behaviour and semantic parts without SingleImage,
 * DefaultContent, preset icons or automatic chrome.
 */
export {
  Root,
  Trigger,
  Content,
  Stage,
  Image,
  Header,
  Toolbar,
  Footer,
  Title,
  Counter,
  Loading,
  ErrorState,
  Close,
  Prev,
  Next,
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  FitToWindow,
  ActualSize,
  Download,
  Thumbnails,
}

export { useViewer, useLabels } from './react/context'
export { en, defaultLabels } from './labels'
export { Slot, composeRefs } from './react/slot'
export type {
  ImageItem,
  ViewerApi,
  ViewerStatus,
  Extension,
  ImageViewRootProps,
  ViewerLabels,
} from './types'
export type { ControlProps, DownloadProps } from './react/parts/controls'
export type {
  CounterProps,
  ErrorProps,
  RegionProps,
  StatusProps,
  TitleProps,
} from './react/parts/containers'
export type { ThumbnailsProps, ThumbnailsMode } from './react/parts/Thumbnails'
export type { Size, Point, Transform, Bounds } from './core/types'
