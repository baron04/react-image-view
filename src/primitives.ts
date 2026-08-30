import { Group } from './react/parts/Group'
import { ImageView } from './react/parts/ImageView'
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
 * Headless entry: behaviour and semantic parts without `DefaultContent`,
 * icons or automatic chrome.
 *
 * `ImageView` here is the trigger and nothing more — it always requires a
 * `Group`. The main entry's component of the same name adds one thing on
 * top: when there is no `Group`, it stands up the default UI around itself.
 * That fallback is what pulls the preset in, which is why it lives there and
 * not here — the same split `Group` already has between the two entries.
 */
export {
  Group,
  ImageView,
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
export { en } from './labels'
export { Slot, composeRefs } from './react/slot'
export type {
  ImageItem,
  ViewerApi,
  ViewerStatus,
  Extension,
  ImageViewGroupProps,
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
export type { ImageProps, ImageRenderContext } from './react/parts/Image'
export type { Size, Point, Transform, Bounds } from './core/types'
