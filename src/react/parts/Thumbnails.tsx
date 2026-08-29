import * as React from 'react'
import { useViewerContext } from '../context'

export type ThumbnailsMode = 'auto' | 'always' | 'never'

export interface ThumbnailsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * `auto` (default) renders nothing for a single image and lets a narrow
   * viewport hide the strip via CSS — on a phone it costs about 15% of the
   * screen for little benefit at that scale. `always` keeps it up regardless
   * of width or count; `never` renders nothing.
   */
  mode?: ThumbnailsMode
}

/**
 * A horizontal strip of every image in the set. It is never part of
 * `DefaultContent` automatically; add it explicitly where direct navigation
 * through a larger set is worth the space.
 */
export const Thumbnails = React.forwardRef<HTMLDivElement, ThumbnailsProps>(function Thumbnails(
  { mode = 'auto', ...rest },
  forwardedRef,
) {
  const { images, api, labels } = useViewerContext('Thumbnails')
  const stripRef = React.useRef<HTMLDivElement | null>(null)
  const activeRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [api.index])

  if (mode === 'never' || (mode === 'auto' && images.length <= 1)) return null

  return (
    <div
      {...rest}
      ref={(node) => {
        stripRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }}
      data-image-view-thumbnails=""
      data-mode={mode}
      // A group of navigation buttons, not tabs. The tab pattern is a
      // contract — tabs own a tabpanel via aria-controls and expect roving
      // focus with arrow keys — and none of that is true here, where the
      // arrow keys are already bound to paging. Claiming `tablist`/`tab`
      // announced "tab 2 of 4" and set up expectations the widget breaks.
      role="group"
      aria-label={labels.thumbnails}
    >
      {images.map((item, i) => {
        const active = i === api.index
        return (
          <button
            key={`${item.src}-${i}`}
            ref={active ? activeRef : undefined}
            type="button"
            data-image-view-thumb=""
            data-active={active ? '' : undefined}
            // `aria-current`, not `aria-selected`: selection belongs to the
            // tab/option patterns, whereas this is "the one you are looking
            // at" within a set of navigation controls.
            aria-current={active ? 'true' : undefined}
            aria-label={item.name ?? item.alt ?? labels.thumbnailAt(i)}
            onClick={() => api.go(i)}
          >
            <img src={item.src} alt="" draggable={false} />
          </button>
        )
      })}
    </div>
  )
})
