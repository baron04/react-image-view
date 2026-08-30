import * as React from 'react'
import type { ImageViewGroupProps } from '../types'
import { Group as PrimitiveGroup } from '../react/parts/Group'
import { Content } from '../react/parts/Content'
import { DefaultContent } from './DefaultContent'

/**
 * The batteries-included Group exported from the package's main entry.
 *
 * Keeping this small assembly outside the primitive Group is what lets
 * `react-img-view/primitives` stay independent from the default chrome,
 * icons, error UI and future presets: when no Content is supplied, the
 * polished default is appended here rather than there.
 */
export function Group({ children, ...props }: ImageViewGroupProps) {
  const hasContent = React.Children.toArray(children).some(
    (child) =>
      React.isValidElement(child) && (child.type === Content || child.type === DefaultContent),
  )

  return (
    <PrimitiveGroup {...props}>
      {children}
      {!hasContent && <DefaultContent />}
    </PrimitiveGroup>
  )
}
