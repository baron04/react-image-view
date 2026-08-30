import * as React from 'react'
import { Group } from './Group'
import { Trigger } from '../react/parts/Trigger'
import { useOptionalViewerContext } from '../react/context'
import type { ImageItem, ViewerLabels } from '../types'
import { DefaultContent, type DefaultContentProps } from './DefaultContent'

/**
 * Declared rather than pulled in from `@types/node`: this package targets the
 * browser and has no Node types. Written as the literal `process.env.NODE_ENV`
 * member expression on purpose — that exact form is what bundlers substitute,
 * and it is what lets the warning below vanish from production output. The
 * `typeof` guard keeps it from throwing where `process` genuinely does not
 * exist, such as an unbundled ES module loaded straight from a CDN.
 */
declare const process: { env: { NODE_ENV?: string } }

export interface ImageViewProps extends ImageItem {
  children: React.ReactElement
  /**
   * Position among the slides. Registration order is used when this is left
   * off, which is right for a plain list; pass it explicitly wherever mount
   * order and visual order can diverge — virtualised tables, Suspense
   * boundaries, anything that streams in.
   */
  index?: number
  disabled?: boolean
  /**
   * Viewer-level settings, honoured only when this `ImageView` has no `Group`
   * above it and is therefore standing up a viewer of its own. Inside a
   * `Group`, the group owns them — see the development warning below.
   */
  container?: HTMLElement | null
  labels?: Partial<ViewerLabels>
  renderImage?: DefaultContentProps['renderImage']
}

const VIEWER_LEVEL_PROPS = ['container', 'labels', 'renderImage'] as const

/**
 * A thumbnail that opens the viewer.
 *
 * One component covers both shapes because they are the same intent at
 * different scales, and splitting them used to mean renaming every call site
 * the moment a second image appeared:
 *
 * - Inside a `Group`, this is purely a trigger. The group owns the image set,
 *   the open state, and the chrome, so every `ImageView` under it opens the
 *   same viewer and pages between its siblings.
 * - On its own, there is nothing to share with, so it stands up a `Group` and
 *   the default UI around itself. That is the one-line case.
 *
 * The split is decided from context rather than from a prop, so growing a
 * single image into a gallery is purely additive: wrap the existing
 * `ImageView`s in a `Group`.
 */
export function ImageView({
  children,
  index,
  disabled,
  container,
  labels,
  renderImage,
  ...item
}: ImageViewProps) {
  const grouped = useOptionalViewerContext() !== null

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && grouped) {
    // Silently ignoring these is exactly the failure that made merging the two
    // components risky: the group's value wins, the one written here does
    // nothing, and nothing says so. Settings that configure a viewer belong on
    // the thing that owns the viewer.
    const stray = VIEWER_LEVEL_PROPS.filter(
      (name) => ({ container, labels, renderImage })[name] !== undefined,
    )
    if (stray.length > 0) {
      console.warn(
        `<ImageView> ignored ${stray.join(', ')}: <ImageView.Group> owns those. Move them to it.`,
      )
    }
  }

  if (grouped) {
    return (
      <Trigger index={index} disabled={disabled} {...item}>
        {children}
      </Trigger>
    )
  }

  return (
    <Group images={[item]} container={container} labels={labels}>
      <Trigger index={0} disabled={disabled} {...item}>
        {children}
      </Trigger>
      <DefaultContent renderImage={renderImage} />
    </Group>
  )
}
