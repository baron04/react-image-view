import * as React from 'react'
import type { ImageViewRootProps } from '../types'
import { Root as PrimitiveRoot } from '../react/parts/Root'
import { Content } from '../react/parts/Content'
import { DefaultContent } from './DefaultContent'

/**
 * The batteries-included Root exported from the package's main entry.
 *
 * Keeping this small assembly outside the primitive Root is what lets
 * `react-img-view/primitives` stay independent from the default chrome,
 * icons, error UI and future presets. Existing main-entry behaviour remains
 * unchanged: when no Content is supplied, the reviewed default is appended.
 */
export function Root({ children, ...props }: ImageViewRootProps) {
  const hasContent = React.Children.toArray(children).some(
    (child) =>
      React.isValidElement(child) && (child.type === Content || child.type === DefaultContent),
  )

  return (
    <PrimitiveRoot {...props}>
      {children}
      {!hasContent && <DefaultContent />}
    </PrimitiveRoot>
  )
}
