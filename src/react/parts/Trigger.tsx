import * as React from 'react'
import { Slot } from '../slot'
import { useViewerContext } from '../context'
import type { ImageItem } from '../../types'

export interface TriggerProps extends ImageItem {
  children: React.ReactElement
  /**
   * Position among the slides. Registration order is used when this is left
   * off, which is right for a plain list; pass it explicitly wherever mount
   * order and visual order can diverge — virtualised tables, Suspense
   * boundaries, anything that streams in.
   */
  index?: number
  disabled?: boolean
}

let uid = 0

export const Trigger = React.forwardRef<HTMLElement, TriggerProps>(function Trigger(
  { children, index, disabled, ...item },
  forwardedRef,
) {
  const ctx = useViewerContext('Trigger')
  const nodeRef = React.useRef<HTMLElement | null>(null)
  const id = React.useMemo(() => `trigger-${++uid}`, [])

  React.useEffect(
    () => ctx.registerTrigger({ id, item, getRect: () => nodeRef.current?.getBoundingClientRect() ?? null }),
    // `item` is spread from props; re-registering on every field would thrash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, id, item.src, item.alt, item.name],
  )

  return (
    <Slot
      ref={(node: HTMLElement) => {
        nodeRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }}
      data-image-view-trigger=""
      data-disabled={disabled ? '' : undefined}
      onClick={() => {
        if (disabled) return
        ctx.openAt(index ?? ctx.indexOf(id), nodeRef.current?.getBoundingClientRect() ?? null)
      }}
    >
      {children}
    </Slot>
  )
})
