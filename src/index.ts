import { Root } from './react/parts/Root'
import { Trigger } from './react/parts/Trigger'
import { Content } from './react/parts/Content'

export const ImageView = { Root, Trigger, Content }

export { Root, Trigger, Content }
export { useViewer } from './react/context'
export { Slot, composeRefs } from './react/slot'
export type { ImageItem, ViewerApi, Extension, ImageViewRootProps, GestureHookPhase } from './types'
export type { Size, Point, Transform, Bounds } from './core/types'
export * as core from './core'
