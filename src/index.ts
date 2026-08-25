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
import { Thumbnails } from './react/parts/Thumbnails'
import { SingleImage } from './preset/SingleImage'
import { DefaultContent } from './preset/DefaultContent'

/**
 * `<ImageView src alt>` is the L1 entry point (a single image, one line, no
 * further setup); the same callable also carries every part as a static, so
 * `<ImageView.Root>`/`<ImageView.Trigger>`/… reach L2 and L3 without a second
 * import. There is no private assembly behind any tier — L1 wraps L2's
 * default, and L2 is L3's `Root` auto-completing itself with the same
 * `DefaultContent` the registry's copy-paste source starts from.
 */
export const ImageView = Object.assign(SingleImage, {
  Root, Trigger, Content, Stage, Image,
  Header, Toolbar, Footer, Title, Counter, Loading, Error: ErrorState,
  Close, Prev, Next, ZoomIn, ZoomOut, RotateLeft, RotateRight,
  FitToWindow, ActualSize, Download, Thumbnails,
  /** The assembled default content — swap it or use it as a starting point. */
  DefaultContent,
})

export {
  Root, Trigger, Content, Stage, Image,
  Header, Toolbar, Footer, Title, Counter, Loading, ErrorState,
  Close, Prev, Next, ZoomIn, ZoomOut, RotateLeft, RotateRight,
  FitToWindow, ActualSize, Download, Thumbnails,
  DefaultContent,
}

export { useViewer, useLabels } from './react/context'
export { defaultLabels } from './labels'
export { Slot, composeRefs } from './react/slot'
export type {
  ImageItem, ViewerApi, ViewerStatus, Extension, ImageViewRootProps, GestureHookPhase,
  ViewerLabels,
} from './types'
export type { ControlProps, DownloadProps } from './react/parts/controls'
export type { CounterProps, ErrorProps, RegionProps, StatusProps, TitleProps } from './react/parts/containers'
export type { ThumbnailsProps, ThumbnailsMode } from './react/parts/Thumbnails'
export type { SingleImageProps } from './preset/SingleImage'
export type { DefaultContentProps } from './preset/DefaultContent'
export type { Size, Point, Transform, Bounds } from './core/types'
export * as core from './core'
