import * as React from 'react'

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * Geometry has to be resolved before the browser paints — measuring in a
 * passive effect means one frame drawn at the wrong scale, which reads as the
 * image flashing at full size before snapping to fit. React warns about layout
 * effects during SSR, hence the swap.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect
