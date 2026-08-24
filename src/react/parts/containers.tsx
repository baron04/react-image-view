import * as React from 'react'
import { Slot } from '../slot'
import { useViewerContext } from '../context'

export interface RegionProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

function region(part: string, displayName: string) {
  const Component = React.forwardRef<HTMLDivElement, RegionProps>(function Region(
    { asChild, ...rest },
    ref,
  ) {
    const Comp: React.ElementType = asChild ? Slot : 'div'
    return <Comp {...rest} ref={ref} data-image-view-region={part} />
  })
  Component.displayName = displayName
  return Component
}

/** Layout slots only. They contribute a hook for styling and nothing else. */
export const Header = region('header', 'ImageView.Header')
export const Toolbar = region('toolbar', 'ImageView.Toolbar')
export const Footer = region('footer', 'ImageView.Footer')

export interface TitleProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

/** The current file's name, falling back to its alt text. */
export const Title = React.forwardRef<HTMLDivElement, TitleProps>(function Title(
  { asChild, children, ...rest },
  ref,
) {
  const { images, api } = useViewerContext('Title')
  const current = images[api.index]
  const Comp: React.ElementType = asChild ? Slot : 'div'
  return (
    <Comp {...rest} ref={ref} data-image-view-title="">
      {children ?? current?.name ?? current?.alt ?? ''}
    </Comp>
  )
})

export interface CounterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  asChild?: boolean
  /** A render function receives the position, for formats other than "3 / 8". */
  children?: React.ReactNode | ((state: { index: number; total: number }) => React.ReactNode)
}

/**
 * Position in the set.
 *
 * Not part of any preset: with the handful of attachments this is built for,
 * the arrows already say whether there is more. Drop it in for the galleries
 * where "how many left" is a real question.
 */
export const Counter = React.forwardRef<HTMLDivElement, CounterProps>(function Counter(
  { asChild, children, ...rest },
  ref,
) {
  const { api } = useViewerContext('Counter')
  const Comp: React.ElementType = asChild ? Slot : 'div'
  const state = { index: api.index, total: api.total }
  return (
    <Comp {...rest} ref={ref} data-image-view-counter="">
      {typeof children === 'function' ? children(state) : (children ?? `${api.index + 1} / ${api.total}`)}
    </Comp>
  )
})

export interface StatusProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

/** Rendered only while the current image is still being fetched or decoded. */
export const Loading = React.forwardRef<HTMLDivElement, StatusProps>(function Loading(
  { asChild, ...rest },
  ref,
) {
  const { api } = useViewerContext('Loading')
  if (api.status !== 'loading') return null
  const Comp: React.ElementType = asChild ? Slot : 'div'
  return <Comp {...rest} ref={ref} data-image-view-loading="" role="status" aria-live="polite" />
})

export interface ErrorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  asChild?: boolean
  /** A render function receives `retry`, so the button can live in your markup. */
  children?: React.ReactNode | ((state: { retry(): void }) => React.ReactNode)
}

export const ErrorState = React.forwardRef<HTMLDivElement, ErrorProps>(function ErrorState(
  { asChild, children, ...rest },
  ref,
) {
  const { api } = useViewerContext('Error')
  if (api.status !== 'error') return null
  const Comp: React.ElementType = asChild ? Slot : 'div'
  return (
    <Comp {...rest} ref={ref} data-image-view-error="" role="alert">
      {typeof children === 'function' ? children({ retry: api.retry }) : children}
    </Comp>
  )
})
