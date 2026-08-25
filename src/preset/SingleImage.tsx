import * as React from 'react'
import { Root } from '../react/parts/Root'
import { Trigger } from '../react/parts/Trigger'
import type { ImageItem, ViewerLabels } from '../types'

export interface SingleImageProps extends ImageItem {
  children: React.ReactElement
  /** Forwarded to Root — see ImageViewRootProps for what they do. */
  container?: HTMLElement | null
  labels?: Partial<ViewerLabels>
}

/**
 * The one-line entry point: wrap a single trigger element, get a fully
 * assembled preview with no further setup. This is `Root` and `Trigger`
 * pre-wired for the case with nothing to share state across — reaching for
 * `ImageView.Root` directly only matters once there is more than one image or
 * the default UI needs replacing.
 */
export function SingleImage({ children, container, labels, ...item }: SingleImageProps) {
  return (
    <Root images={[item]} container={container} labels={labels}>
      <Trigger index={0} {...item}>
        {children}
      </Trigger>
    </Root>
  )
}
