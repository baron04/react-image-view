import { Group } from './preset/Group'
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
import { ImageView as ImageViewTrigger } from './preset/ImageView'
import { DefaultContent } from './preset/DefaultContent'

/**
 * `<ImageView src alt>` wraps one thumbnail: on its own it stands up a whole
 * viewer, and inside `<ImageView.Group>` it is a trigger sharing that group's
 * viewer with its siblings. The same callable carries every part as a static,
 * so `<ImageView.Group>`/`<ImageView.Content>`/… compose a custom interface
 * without a second import.
 *
 * There is no private assembly behind any of it: the one-line form is a
 * `Group` with one trigger, and `Group` completes itself with the same
 * `DefaultContent` the registry's copy-paste source starts from.
 */
export const ImageView = /* @__PURE__ */ Object.assign(ImageViewTrigger, {
  Group,
  Content,
  Stage,
  Image,
  Header,
  Toolbar,
  Footer,
  Title,
  Counter,
  Loading,
  Error: ErrorState,
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
  /** The assembled default content — swap it or use it as a starting point. */
  DefaultContent,
})

export {
  Group,
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
  DefaultContent,
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
export type { ImageViewProps } from './preset/ImageView'
export type { DefaultContentProps } from './preset/DefaultContent'
export type { Size, Point, Transform, Bounds } from './core/types'
