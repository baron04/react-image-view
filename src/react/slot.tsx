import * as React from 'react'

type AnyProps = Record<string, unknown>

export function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<T | null>).current = node
    }
  }
}

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...childProps }

  for (const key in slotProps) {
    const slotValue = slotProps[key]
    const childValue = childProps[key]

    if (/^on[A-Z]/.test(key)) {
      // Both run, child first, so a consumer's own handler can preventDefault.
      if (typeof slotValue === 'function' && typeof childValue === 'function') {
        merged[key] = (...args: unknown[]) => {
          ;(childValue as (...a: unknown[]) => void)(...args)
          if ((args[0] as AnyProps)?.defaultPrevented) return
          ;(slotValue as (...a: unknown[]) => void)(...args)
        }
        continue
      }
      merged[key] = slotValue ?? childValue
      continue
    }

    if (key === 'style') {
      merged.style = { ...(slotValue as object), ...(childValue as object) }
      continue
    }
    if (key === 'className') {
      merged.className = [slotValue, childValue].filter(Boolean).join(' ')
      continue
    }
    merged[key] = slotValue
  }

  return merged
}

/**
 * Renders its child instead of a DOM node of its own, merging props and refs
 * onto it. This is what lets a trigger wrap `next/image`, a `<picture>`, or a
 * design system's own Button: the library contributes behaviour and `data-*`
 * state, and never dictates the element.
 */
export const Slot = React.forwardRef<HTMLElement, { children?: React.ReactNode } & AnyProps>(
  function Slot({ children, ...slotProps }, forwardedRef) {
    if (!React.isValidElement(children)) return null

    const child = children as React.ReactElement<AnyProps> & { ref?: React.Ref<HTMLElement> }
    // React 19 exposes ref as a normal prop; React 18 keeps it on the element.
    const childRef = (child.props as AnyProps).ref ?? child.ref

    return React.cloneElement(child, {
      ...mergeProps(slotProps, child.props as AnyProps),
      ref: composeRefs(forwardedRef, childRef as React.Ref<HTMLElement>),
    } as AnyProps)
  },
)
